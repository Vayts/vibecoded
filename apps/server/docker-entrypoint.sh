#!/bin/sh
set -e

echo "Running Prisma migrations..."
/app/apps/server/node_modules/.bin/prisma migrate deploy \
  --schema=/app/apps/server/prisma/schema.prisma

echo "Starting server..."
exec node /app/apps/server/dist/index.js
