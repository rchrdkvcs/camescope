# 1. Utiliser une version STABLE (LTS) de Node.
# 'bookworm' est bien car c'est une Debian stable pour compiler Mediasoup.
FROM node:22-bookworm AS base

# --- Deps Stage (Toutes les dépendances) ---
FROM base AS deps

# Installation des outils pour compiler le C++ (Mediasoup)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. IMPORTANT : Copier aussi le package-lock.json !
COPY package*.json ./

# Installation complète (dev + prod) pour avoir typescript, ace, etc.
RUN npm install

# --- Production Deps Stage (Uniquement pour le run) ---
FROM base AS production-deps

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# --- Build Stage ---
FROM base AS build
WORKDIR /app

# On récupère les node_modules COMPLETS (avec devDeps) de l'étape deps
COPY --from=deps /app/node_modules /app/node_modules

# On copie le code source
ADD . .

# 3. Le build devrait fonctionner maintenant grâce à Node 22
RUN node ace build --ignore-ts-errors

# --- Final Stage ---
FROM base
WORKDIR /app

# On récupère les dépendances de PROD (plus légères)
COPY --from=production-deps /app/node_modules /app/node_modules
# On récupère le build compilé
COPY --from=build /app/build /app

EXPOSE 3333
# Plage de ports Mediasoup
EXPOSE 10000-10100/udp

CMD ["node", "./bin/server.js"]
