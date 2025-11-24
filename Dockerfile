# ==========================================
# BASE : Image officielle Bun
# ==========================================
FROM oven/bun:1 AS base
WORKDIR /app

# ==========================================
# DEPS : Installation des dépendances (Dev + Prod)
# ==========================================
FROM base AS deps

# Installation de Python et G++ (Obligatoire pour compiler Mediasoup)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# Installation rapide avec Bun
RUN bun install --frozen-lockfile

# ==========================================
# BUILD : Compilation AdonisJS (TS -> JS)
# ==========================================
FROM base AS build

# On récupère les node_modules de l'étape deps
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

# Build du projet
# Bun exécute le script "build" du package.json (souvent "node ace build")
# On force l'utilisation de bun pour exécuter ace
RUN bun run ace build

# ==========================================
# PROD DEPS : Dépendances de production uniquement
# ==========================================
FROM base AS production-deps

# On a encore besoin des outils de compil pour Mediasoup ici !
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# --production évite d'installer typescript, eslint, etc.
RUN bun install --frozen-lockfile --production

# ==========================================
# FINAL : L'image qui part en prod
# ==========================================
FROM base AS final
ENV NODE_ENV=production

# Copie des modules de prod (contenant le binaire mediasoup compilé)
COPY --from=production-deps /app/node_modules /app/node_modules

# Copie du dossier build généré
COPY --from=build /app/build /app

# Ports
EXPOSE 3333
EXPOSE 10000-10100/udp

# Démarrage avec Bun directement (plus rapide que Node)
CMD ["bun", "run", "bin/server.js"]
