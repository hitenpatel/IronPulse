#!/bin/sh
# Usage: remote-deploy.sh <staging|prod> <image-tag>
# .env is written only after migrate succeeds — failed deploys leave the
# previous tag in place for restarts.
set -eu
# Synology ships docker in /usr/local/bin, which non-interactive ssh PATH lacks.
export PATH="/usr/local/bin:$PATH"
ENV="$1"; TAG="$2"
[ -n "$ENV" ] && [ -n "$TAG" ] || { echo "usage: remote-deploy.sh <staging|prod> <image-tag>"; exit 2; }
case "$ENV" in
  staging|prod) ;;
  *) echo "invalid env: '$ENV' (must be staging or prod)" >&2; exit 2 ;;
esac
case "$TAG" in
  *[!A-Za-z0-9._-]*|"") echo "invalid tag: '$TAG'" >&2; exit 2 ;;
esac
COMPOSE="docker compose -f docker-compose.yml -f compose.$ENV.yml --env-file .env"
PREV=$(grep '^IMAGE_TAG=' .env | cut -d= -f2)
echo "previous tag: ${PREV:-<none>}"
IMAGE_TAG="$TAG" $COMPOSE pull mettlelift
# Overriding --entrypoint skips the image's pg_isready wait, so on a fresh
# volume prisma migrate can race postgres initdb. Wait explicitly here.
WAIT_PG='until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do echo waiting for postgres; sleep 2; done'
if [ "$ENV" = "staging" ]; then
  IMAGE_TAG="$TAG" $COMPOSE run --rm --entrypoint sh mettlelift -c "cd /app/packages/db && $WAIT_PG && prisma migrate deploy && prisma db seed && tsx seeds/seed-dev.ts"
else
  IMAGE_TAG="$TAG" $COMPOSE run --rm --entrypoint sh mettlelift -c "cd /app/packages/db && $WAIT_PG && prisma migrate deploy && prisma db seed"
fi
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" .env
$COMPOSE up -d --no-build
echo "deployed $TAG (previous: ${PREV:-<none>})"
