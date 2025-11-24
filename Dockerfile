FROM oven/bun:1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --trusted-dependencies="mediasoup"

COPY . .
RUN bun run ace build

ENV NODE_ENV=production

EXPOSE 3333
EXPOSE 2000-2020/udp
EXPOSE 10000-10100/udp

CMD ["bun", "run", "build/bin/server.js"]
