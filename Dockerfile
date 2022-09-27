FROM node:alpine3.14
RUN mkdir /app
WORKDIR /app
CMD npm run start