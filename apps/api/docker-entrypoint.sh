#!/bin/sh
set -e

echo "Running Prisma migrations..."
/app/apps/api/node_modules/.bin/prisma migrate deploy \
  --schema=/app/apps/api/prisma/schema.prisma

echo "Starting API..."
exec node /app/apps/api/dist/main.js
