FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
  
RUN npm install --only=production

FROM node:20-alpine

WORKDIR /app

COPY package*.json .
COPY src ./src
COPY index.js .
COPY manifest.js .

COPY --from=base /app/node_modules ./node_modules

EXPOSE 8080

ENTRYPOINT ["node","./index.js"]