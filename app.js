/*
* Simple voting app
*/

const http = require('http');
var fs = require('fs');
const crypto = require('crypto');
var qs = require('querystring');

// Change to what is preferred. Im just running locally!
const hostname = '127.0.0.1';
const port = 8080;

// votes file
var votes_file = "votes/votes.csv";
var week_stats_file = "votes/votes_week.csv";

var count_downs = {}; // URL: tidsstämpel
var count_down_names = {}; // URL: namn

function not_found(res) {
	res.statusCode = 404;
    res.end();
}

function ok(res) {
	res.statusCode = 200;
	res.end();
}

function send_json(response, object) {
  response.writeHead(200, {"Content-Type": "application/json"});
  var json = JSON.stringify(object);
  response.end(json);
}

function month_name_from_string_nbr(string_nbr)
{
	if (string_nbr == "01")
		return "Jan";
	if (string_nbr == "02")
		return "Feb";
	if (string_nbr == "03")
		return "Mar";
	if (string_nbr == "04")
		return "Apr";
	if (string_nbr == "05")
		return "May";
	if (string_nbr == "06")
		return "Jun";
	if (string_nbr == "07")
		return "Jul";
	if (string_nbr == "08")
		return "Aug";
	if (string_nbr == "09")
		return "Sep";
	if (string_nbr == "10")
		return "Oct";
	if (string_nbr == "11")
		return "Nov";
	if (string_nbr == "12")
		return "Dec";
}

function timestamp_log(log) {
	console.log("[" + (new Date()).toISOString() + "] " + log);
}

function new_countdown(date_time, name) 
{
	var regexp = /\d\d\d\d\-\d\d-\d\d_\d\d:\d\d/;

	var hash = "ERROR";

	if ( date_time.match(regexp) ) {

		var coundown_time = date_time.split("_")[1] + ":00";

		var countdown_year = date_time.split("_")[0].split("-")[0];
		var countdown_day = date_time.split("_")[0].split("-")[2];
		var countdown_month = date_time.split("_")[0].split("-")[1];

		countdown_month = month_name_from_string_nbr(countdown_month);

	 	hash = crypto.createHash('md5').update(date_time).digest("hex")

	 	var nice_date = countdown_month + " " + countdown_day 
	 	                          + ", " + countdown_year + " " + coundown_time;

	 	count_downs["/" + hash] = nice_date;
	 	count_down_names["/" + hash] = name;

	 	timestamp_log("Created a new countdown: " + hash);
	 	timestamp_log("count_downs['" + hash + "']: " + count_downs["/" + hash]);

	} else {
		timestamp_log("Failed to register new count down based on date: " + date_time);
	}

	return hash;

}

function output_file(res, url) {
	try {

		var stats = fs.lstatSync(url);

		if ( stats.isFile() ) {

			var html = fs.readFileSync(url);

			// mime type handling
			var datatype = "text/plain";

			if ( url.endsWith(".csv") ) {
				datatype = "text/csv";
			} else if ( url.endsWith(".jpg") ) {
				datatype = "image/jpeg";
			} else if ( url.endsWith(".ico")) {
				datatype = "image/png";
			}

			res.writeHead(200, {'Content-Type': datatype});
			res.end(html);

			return true;

		}

	} catch (e) {};

	return false;
}

function output_index_replace_hash(res, hash) {

	var url = "index.html";

	try {

		var stats = fs.lstatSync(url);

		if ( stats.isFile() ) {

			var html = fs.readFileSync(url, 'utf8');
			html = html.replace(/REGISTER A NEW COUNTDOWN/, hash);

			// mime type handling
			var datatype = "text/html";

			res.writeHead(200, {'Content-Type': datatype});
			res.end(html);

			return true;

		}

	} catch (e) {console.log(e);}

	return false;
}

const server = http.createServer((req, res) => {

	if ( req.url == "/" ) {

		var html = fs.readFileSync('index.html');
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(html);

	} else {
		
		var i = 1;

		while ( req.url[i] == "/" )
			i++;

		var url = req.url.replace(/\/+/g,'/').substr(1);

		var ip = req.headers['x-forwarded-for'] || 
			req.connection.remoteAddress || 
			req.socket.remoteAddress ||
			(req.connection.socket ? req.connection.socket.remoteAddress : null);

		var filereq = output_file(res,url);

		if ( ! filereq ) {
			var failed = 1;

			if ( url.startsWith("countdown.cgi") ) {
				// This server has one job, and one job only.

				if (req.method == 'POST') {
					var body = '';

					req.on('data', function (data) {
						body += data;

						// Too much POST data, kill the connection!
						// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
						if (body.length > 1e6)
						req.connection.destroy();
					});

					req.on('end', function () {
						var post = qs.parse(body);

						var countdown_date = post["countdown"];
						var countdown_name = post["name"];
						var result = new_countdown(countdown_date, countdown_name);

						if ( result != "ERROR" ) {

							var response_obj = {"href": result};

							send_json(res, response_obj);

						} else {
							not_found(res);
						}

					});

					failed = 0;
				} else if ( req.method == 'GET' ) {

					var cgi_call = url.split("?");

					if ( cgi_call.length > 1 ) {

						var prop = cgi_call[1].split("getCountDown=")

						if ( prop.length > 1 ) {

							var count_down_hash = prop[1];
							var count_down_path = "/" + count_down_hash;

							if ( count_down_path in count_downs ) {

								var json_object = {"count-down-to": count_downs[count_down_path], 
								"name": count_down_names[count_down_path]};

								send_json(res, json_object);

								failed = 0;
							}

						}

					}

				}

			} else if ( req.method == "GET" ) {

				if ( req.url in count_downs ) {

					var hash = req.url.split("/")[1];

					output_index_replace_hash(res,hash);

					failed = 0;
				}

			}  else if ( req.method == 'HEAD') {
				output_file(res,"favicon.ico");
			}

			if ( failed )
				not_found(res);

		} else {
			timestamp_log( ip + ": " + req.url);
		}

	}

});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
