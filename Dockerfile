
FROM node:21

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mv .env.dist .env

ENV PORT=8080

EXPOSE 80
EXPOSE 8080

RUN apt update
RUN apt install nginx
RUN cp ./init/nginx.conf /etc/nginx/

CMD [ "npm", "start" ]