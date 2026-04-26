#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/db
# Use the globally-installed prisma directly. `npx prisma` resolves the
# local packages/db/node_modules/prisma symlink first, which dangles
# in the runtime image because the pnpm .pnpm/ store isn't copied.
prisma migrate deploy

echo "Running database seed..."
# `prisma db seed` reads the seed entry from packages/db/package.json
# (`"prisma": { "seed": "tsx seeds/seed.ts" }`). tsx is also globally
# installed in the runtime image so this works without local resolution.
prisma db seed

echo "Starting IronPulse..."
cd /app
exec "$@"
