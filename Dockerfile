FROM ubuntu
RUN apt-get update
RUN apt-get install nodejs -y 
#RUN rm -f package-lock.json
RUN apt-get install npm -y
RUN apt-get install apt-utils -y

WORKDIR /usr/src/app

COPY . .

EXPOSE 8080
CMD ["node", "app.js"]