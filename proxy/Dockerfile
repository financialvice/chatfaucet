FROM oven/bun:1.3

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["bun", "run", "start"]
