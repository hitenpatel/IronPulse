#!/bin/sh
# Usage: remote-deploy.sh <staging|prod> <image-tag>
# .env is written only after migrate succeeds — failed deploys leave the
# previous tag in place for restarts.
set -e
ENV="$1"; TAG="$2"
[ -n "$ENV" ] && [ -n "$TAG" ] || { echo "usage: remote-deploy.sh <staging|prod> <image-tag>"; exit 2; }
COMPOSE="docker compose -f docker-compose.yml -f compose.$ENV.yml --env-file .env"
PREV=$(grep '^IMAGE_TAG=' .env | cut -d= -f2)
echo "previous tag: ${PREV:-<none>}"
IMAGE_TAG="$TAG" $COMPOSE pull mettlelift
if [ "$ENV" = "staging" ]; then
  IMAGE_TAG="$TAG" $COMPOSE run --rm --entrypoint sh mettlelift -c "cd /app/packages/db && prisma migrate deploy && prisma db seed && tsx seeds/seed-dev.ts"
else
  IMAGE_TAG="$TAG" $COMPOSE run --rm --entrypoint sh mettlelift -c "cd /app/packages/db && prisma migrate deploy && prisma db seed"
fi
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" .env
$COMPOSE up -d --no-build
echo "deployed $TAG (previous: ${PREV:-<none>})"
