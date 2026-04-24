FROM oven/bun:1.3-alpine

WORKDIR /app

COPY src ./src
COPY package.json ./

ENV PORT=8080
EXPOSE 8080

CMD ["bun", "run", "start"]
