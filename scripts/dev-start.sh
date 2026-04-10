#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml"

echo "=== IronPulse Local Dev Environment ==="
echo ""

# ── 1. Generate .env if missing ──
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  SECRET=$(openssl rand -base64 32)
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  sed -i "s|generate-with-openssl-rand-base64-32|${SECRET}|" .env
  sed -i "s|DEVICE_TOKEN_ENCRYPTION_KEY=\"\"|DEVICE_TOKEN_ENCRYPTION_KEY=\"${ENCRYPTION_KEY}\"|" .env
  sed -i 's|NEXTAUTH_URL="http://localhost:3000"|NEXTAUTH_URL="https://ironpulse.local"|' .env
  echo "  Generated secrets and set NEXTAUTH_URL=https://ironpulse.local"
fi

# ── 2. Add ironpulse.local to /etc/hosts if needed ──
LOCAL_IP=$(hostname -I | awk '{print $1}')
if ! grep -q "ironpulse.local" /etc/hosts 2>/dev/null; then
  echo "Adding ironpulse.local to /etc/hosts (requires sudo)..."
  echo "${LOCAL_IP} ironpulse.local" | sudo tee -a /etc/hosts > /dev/null
fi

# ── 3. Pre-pull Docker images ONE AT A TIME to avoid OOM ──
echo ""
echo "Pulling Docker images (one at a time to avoid memory pressure)..."
for image in "postgis/postgis:16-3.4-alpine" "redis:7-alpine" "minio/minio:latest" "minio/mc:latest" "mongo:7-jammy" "caddy:2-alpine"; do
  echo "  Pulling ${image}..."
  docker pull "$image" --quiet 2>/dev/null || docker pull "$image"
done
echo "  All images ready"

# ── 4. Start infrastructure services SEQUENTIALLY ──
echo ""
echo "Starting database services..."
$COMPOSE up -d postgres
echo "  Waiting for PostgreSQL..."
until $COMPOSE exec postgres pg_isready -U ironpulse -q 2>/dev/null; do sleep 2; done
echo "  PostgreSQL ready"

echo "Starting Redis..."
$COMPOSE up -d redis
until $COMPOSE exec redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 1; done
echo "  Redis ready"

echo "Starting MinIO..."
$COMPOSE up -d minio
sleep 3
$COMPOSE up -d minio-init
echo "  MinIO ready"

# ── 5. Install dependencies (after heavy Docker pulls are done) ──
if [ ! -d node_modules ]; then
  echo ""
  echo "Installing dependencies..."
  pnpm install
fi

# ── 6. Push schema & seed ──
echo ""
echo "Pushing database schema..."
pnpm --filter @ironpulse/db db:push 2>&1 | tail -3

echo "Seeding exercise library..."
pnpm --filter @ironpulse/db db:seed 2>&1 | tail -3

echo "Seeding dev test data..."
pnpm --filter @ironpulse/db db:seed:dev 2>&1 | tail -10

# ── 7. Start Caddy reverse proxy ──
echo ""
echo "Starting Caddy reverse proxy..."
$COMPOSE up -d caddy
echo "  Caddy ready"

# ── 8. Start web app (not in Docker — run locally for hot reload) ──
echo ""
echo "Starting Next.js dev server..."
pnpm --filter @ironpulse/web dev &
WEB_PID=$!

# Wait for app to be ready
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "============================================"
echo "  IronPulse dev environment is ready!"
echo ""
echo "  URL:  https://ironpulse.local"
echo "  IP:   https://${LOCAL_IP}"
echo ""
echo "  Test accounts (password: password123):"
echo "    athlete@test.com  — Athlete tier"
echo "    coach@test.com    — Coach tier"
echo "    free@test.com     — Free tier (imperial)"
echo "    new@test.com      — New user (onboarding)"
echo ""
echo "  Prisma Studio:  pnpm db:studio"
echo "  Stop:           $COMPOSE down"
echo "============================================"

wait $WEB_PID
