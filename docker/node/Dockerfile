FROM node:14.16.0-alpine3.13

RUN npm install -g nodemon

RUN mkdir -p /app

WORKDIR /app

COPY ./docker-entrypoint.sh /

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
