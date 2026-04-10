#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

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
  # Use docker service hostname when running app in docker
  sed -i 's|NEXTAUTH_URL="http://localhost:3000"|NEXTAUTH_URL="https://ironpulse.local"|' .env
  echo "  Generated secrets and set NEXTAUTH_URL=https://ironpulse.local"
fi

# ── 2. Add ironpulse.local to /etc/hosts if needed ──
LOCAL_IP=$(hostname -I | awk '{print $1}')
if ! grep -q "ironpulse.local" /etc/hosts 2>/dev/null; then
  echo "Adding ironpulse.local to /etc/hosts (requires sudo)..."
  echo "${LOCAL_IP} ironpulse.local" | sudo tee -a /etc/hosts > /dev/null
fi

# ── 3. Start infrastructure services ──
echo ""
echo "Starting Docker services..."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d postgres redis minio minio-init mongo mongo-init

echo "Waiting for PostgreSQL..."
until docker compose -f docker/docker-compose.yml exec postgres pg_isready -U ironpulse -q 2>/dev/null; do
  sleep 2
done
echo "  PostgreSQL ready"

# ── 4. Install dependencies ──
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# ── 5. Push schema & seed ──
echo ""
echo "Pushing database schema..."
pnpm --filter @ironpulse/db db:push 2>&1 | tail -3

echo "Seeding exercise library..."
pnpm --filter @ironpulse/db db:seed 2>&1 | tail -3

echo "Seeding dev test data..."
pnpm --filter @ironpulse/db db:seed:dev 2>&1 | tail -10

# ── 6. Start Caddy reverse proxy ──
echo ""
echo "Starting Caddy reverse proxy..."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d caddy

# ── 7. Start web app ──
echo ""
echo "Starting Next.js dev server..."
pnpm --filter @ironpulse/web dev &
WEB_PID=$!

# Wait for app to be ready
echo "Waiting for app to start..."
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
echo "  Stop:           docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down"
echo "============================================"

wait $WEB_PID
