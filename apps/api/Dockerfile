FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first, then api
RUN find /app -name '*.tsbuildinfo' -delete && \
  rm -rf /app/packages/shared/dist /app/apps/api/dist && \
  pnpm --filter @acme/shared build && \
  pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app

# Prisma requires OpenSSL to run migrations
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

# Startup script: run prisma migrate then start api
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD sh -c 'wget -qO- http://localhost:${PORT}/health || exit 1'

CMD ["/app/docker-entrypoint.sh"]
