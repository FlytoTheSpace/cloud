
FROM node:21

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mv .env.dist .env

ENV PORT=8080

EXPOSE 8080

CMD [ "npm", "start" ]