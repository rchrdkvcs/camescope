FROM node:24-alpine AS base

# All deps stage
FROM base AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app
ADD package.json ./
RUN npm install

# Production only
FROM base AS production-deps

RUN apk add --no-cache python3 make g++

WORKDIR /app
ADD package.json ./
RUN npm install --production

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build --ignore-ts-errors

# Production stage
FROM base
WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app

EXPOSE 3333
CMD ["node", "./bin/server.js"]
