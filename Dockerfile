# syntax=docker/dockerfile:1

##########
# base: sistema + libs nativas compartilhadas (argon2, canvas)
##########
FROM node:22-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Libs de runtime exigidas pelo canvas (cairo/pango/jpeg/gif/rsvg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

##########
# deps: instala dependências (camada de maior cache)
##########
FROM base AS deps
# Toolchain para compilar módulos nativos (argon2, canvas)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala TODAS as dependências (inclui dev) para o build
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci

##########
# build: compila o projeto e remove devDependencies
##########
FROM deps AS build
COPY . .
RUN npm run build \
    && npm prune --omit=dev

##########
# runner: imagem final enxuta
##########
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000

# node_modules já sem devDependencies e dist compilado
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
