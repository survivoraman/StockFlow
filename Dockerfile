FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server.js index.html public-placeholder.svg favicon.svg ./
COPY src ./src
RUN addgroup -S stockflow && adduser -S stockflow -G stockflow && mkdir /app/data && chown -R stockflow:stockflow /app
USER stockflow
EXPOSE 8080
CMD ["node", "server.js"]
