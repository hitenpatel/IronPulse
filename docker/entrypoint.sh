#!/bin/sh
set -e

cd /app/packages/db

echo "Waiting for the database to accept TCP connections..."
# On a fresh volume the postgres image first runs a temporary init server on a
# unix socket, then restarts as the real TCP server. compose depends_on can
# report "healthy" during that window, so without this wait schema setup can
# run against a server that's about to restart. pg_isready against the TCP
# DATABASE_URL only succeeds once the real server is listening on the network.
until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
  echo "  ...waiting for postgres"
  sleep 2
done

echo "Syncing database schema..."
# schema.prisma is the source of truth. The prisma/migrations folder is
# incremental-only (no base migration that creates the core tables), so
# `migrate deploy` cannot build a fresh database — this matches how CI
# provisions the DB (`prisma db push`). db push creates/updates every table
# from the schema in one step. Without --accept-data-loss it refuses
# destructive changes, so existing data is never dropped silently.
prisma db push --skip-generate

echo "Ensuring PowerSync publication..."
# Required by the optional `sync` profile (PowerSync logical replication) and
# inert without it. The base migration intentionally defers this to the
# entrypoint. Idempotent across reboots.
prisma db execute --schema prisma/schema.prisma --stdin <<'SQL' || true
DROP PUBLICATION IF EXISTS powersync;
CREATE PUBLICATION powersync FOR ALL TABLES;
SQL

echo "Seeding reference data..."
# `prisma db seed` reads the seed entry from packages/db/package.json
# (`"prisma": { "seed": "tsx seeds/seed.ts" }`). tsx is globally installed in
# the runtime image so this works without local module resolution.
prisma db seed

echo "Starting IronPulse..."
cd /app
exec "$@"
