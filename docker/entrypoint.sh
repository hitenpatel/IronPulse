#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/db
npx prisma migrate deploy

echo "Running database seed..."
npx prisma db seed

echo "Starting IronPulse..."
cd /app
exec "$@"
