# API 3D Mbarete — imagen de producción (Node 20 + Prisma + Express)
# Build: docker build -t 3d-mbarete-api ./back
# Run:  docker-compose.yml (MySQL local) o docker-compose.remote-db.yml + .env.docker

FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

# npm 10.x a veces marca picomatch (vitest/vite) como lock inválido en Linux; npm 11 alinea la validación con el árbol real.
RUN npm install -g npm@11.12.1 \
  && npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev

# --- runtime ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /usr/sbin/nologin --create-home nodejs

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Quitar CRLF si el build se hace desde Windows (evita: exec ... no such file or directory)
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p storage/uploads \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3056

HEALTHCHECK --interval=30s --timeout=8s --start-period=50s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3056)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
