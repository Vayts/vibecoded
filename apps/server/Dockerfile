FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared package first, then server
RUN pnpm --filter @acme/shared build 2>/dev/null || true
WORKDIR /app/apps/server
# Use esbuild (via tsx dep) instead of tsc — 50MB vs 1.2GB memory.
# Type checking is done separately in CI via `tsc --noEmit`.
RUN npx prisma generate && \
    npx esbuild src/index.ts --bundle --platform=node --outdir=dist \
      --packages=external --format=cjs --target=node20

FROM node:20-alpine AS runner
WORKDIR /app

# Prisma requires OpenSSL to run migrations
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/

WORKDIR /app/apps/server

# Startup script: run prisma migrate then start server
COPY apps/server/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD sh -c 'wget -qO- http://localhost:${PORT}/health || exit 1'

CMD ["/app/docker-entrypoint.sh"]
