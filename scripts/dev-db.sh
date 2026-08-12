#!/usr/bin/env bash
# Bring up the dev Postgres (bound to localhost:5432) and apply the current
# Prisma schema. Used to seed a disposable local database that the
# packages/api vitest suite talks to. Never touches production data.
#
# Reset from scratch: pass `reset` as the first argument — drops the dev
# volume, recreates the container, and re-applies the schema.
#
# Usage:
#   scripts/dev-db.sh          # start + migrate (idempotent)
#   scripts/dev-db.sh reset    # nuke volume + reprovision

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose --env-file .env
  -f docker/docker-compose.yml
  -f docker/docker-compose.dev.yml)

DB_URL="postgresql://${POSTGRES_USER:-zor}:${POSTGRES_PASSWORD:-zor}@localhost:5432/${POSTGRES_DB:-zor}"

if [ "${1:-}" = "reset" ]; then
  echo "[dev-db] tearing down postgres + wiping pgdata volume"
  "${COMPOSE[@]}" down postgres 2>/dev/null || true
  docker volume rm docker_pgdata 2>/dev/null || true
fi

echo "[dev-db] starting postgres"
"${COMPOSE[@]}" up -d postgres

echo "[dev-db] waiting for postgres to accept connections"
until docker exec docker-postgres-1 pg_isready -U "${POSTGRES_USER:-zor}" -q 2>/dev/null; do
  sleep 1
done

echo "[dev-db] applying prisma schema"
DATABASE_URL="$DB_URL" pnpm --filter @zor/db exec prisma db push --skip-generate

echo "[dev-db] ready at $DB_URL"
