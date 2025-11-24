# ==========================================
# BASE
# ==========================================
FROM oven/bun:1 AS base
WORKDIR /app

# ==========================================
# DEPS (Dev + Build tools)
# ==========================================
FROM base AS deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ==========================================
# BUILD (TypeScript -> JS)
# ==========================================
FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN bun run ace build

# ==========================================
# PROD DEPS (Le coeur du problème est ici)
# ==========================================
FROM base AS production-deps

# 1. On garde les outils de compilation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# 2. On installe les paquets
RUN bun install --frozen-lockfile --production

# -----------------------------------------------------------
# LE FIX EST ICI : On force la compilation manuelle de Mediasoup
# -----------------------------------------------------------
WORKDIR /app/node_modules/mediasoup
# On configure le build (équivalent du npm install qui ne s'est pas lancé)
RUN python3 worker/scripts/configure.py -R Release
# On compile (crée le fichier mediasoup-worker)
RUN make -C worker/out/Release/ -j$(nproc)
# On revient au dossier racine
WORKDIR /app
# -----------------------------------------------------------

# ==========================================
# FINAL
# ==========================================
FROM base AS final
ENV NODE_ENV=production

# On copie les modules (qui contiennent maintenant le binaire compilé !)
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app

EXPOSE 3333
EXPOSE 10000-10100/udp

CMD ["bun", "run", "bin/server.js"]
