# Pull base image, using Ubuntu latest
FROM ubuntu:latest

# Install Node.js
RUN apt-get update && apt-get install --yes curl
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install --yes nodejs build-essential bison flex

WORKDIR /usr/src/app

COPY . .

EXPOSE 8080
CMD ["node", "app.js"]
