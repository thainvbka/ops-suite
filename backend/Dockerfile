FROM node:18-alpine

WORKDIR /app

# Install docker CLI
RUN apk add --no-cache docker-cli

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "start"]