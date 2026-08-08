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

if [ "${SCHEMA_MANAGEMENT:-push}" = "external" ]; then
  echo "SCHEMA_MANAGEMENT=external — schema and seeds are applied by the deploy job."
else
  echo "Syncing database schema..."
  # schema.prisma is the source of truth in dev. Staging/prod use
  # `prisma migrate deploy`, run once per release by the deploy job
  # (SCHEMA_MANAGEMENT=external) so app restarts never touch the schema.
  prisma db push --skip-generate
  echo "Seeding reference data..."
  prisma db seed
fi

echo "Ensuring PowerSync publication..."
# Required by the optional `sync` profile (PowerSync logical replication) and
# inert without it. Runs on every container start in all environments.
# create-if-missing so staging/prod restarts don't interrupt replication.
prisma db execute --schema prisma/schema.prisma --stdin <<'SQL' || true
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync FOR ALL TABLES;
  END IF;
END
$body$;
SQL

echo "Starting Mettle Lift..."
cd /app
exec "$@"
