FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS api
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
COPY api/prisma ./prisma
RUN npm ci && npx prisma generate
COPY api/src ./src
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/main.ts"]

FROM base AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
CMD ["node", "node_modules/vite/bin/vite.js", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
