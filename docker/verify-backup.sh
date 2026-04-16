#!/bin/bash
set -euo pipefail

# ─── Backup Restore Verification ─────────────────────────
# Picks the latest backup, restores it to a temporary PostgreSQL
# container, runs schema validation, then tears down the container.
# Exit code 0 = backup is restorable, non-zero = failure.
# ──────────────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-/backups}"
CONTAINER_NAME="ironpulse-backup-verify-$$"
PG_IMAGE="postgis/postgis:16-3.4-alpine"
PG_USER="verify"
PG_PASS="verify"
PG_DB="verify"

# ─── Find latest backup ──────────────────────────────────

LATEST=$(ls -t "$BACKUP_DIR"/ironpulse_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "[FAIL] No backup files found in $BACKUP_DIR"
  exit 1
fi

echo "[INFO] Verifying backup: $LATEST ($(du -sh "$LATEST" | cut -f1))"

# ─── Start temporary PostgreSQL ──────────────────────────

cleanup() {
  echo "[INFO] Cleaning up temporary container..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[INFO] Starting temporary PostgreSQL container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASS" \
  -e POSTGRES_DB="$PG_DB" \
  "$PG_IMAGE" \
  postgres -c wal_level=logical >/dev/null

# Wait for PostgreSQL to be ready
echo "[INFO] Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[FAIL] PostgreSQL did not start within 30 seconds"
    exit 1
  fi
  sleep 1
done

# ─── Restore backup ─────────────────────────────────────

echo "[INFO] Restoring backup into temporary database..."
if ! gunzip -c "$LATEST" | docker exec -i "$CONTAINER_NAME" \
  pg_restore -U "$PG_USER" -d "$PG_DB" --no-owner --clean --if-exists 2>/dev/null; then
  # pg_restore returns non-zero for warnings (e.g., "role does not exist")
  # Check if the database is actually usable despite warnings
  echo "[WARN] pg_restore exited with warnings (this is often normal for cross-env restores)"
fi

# ─── Validate schema ────────────────────────────────────

echo "[INFO] Validating restored database..."

VALIDATION=$(docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d "$PG_DB" -t -A <<'SQL'
SELECT json_build_object(
  'table_count', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
  'user_count', (SELECT count(*) FROM "User"),
  'exercise_count', (SELECT count(*) FROM "Exercise"),
  'has_prisma_migrations', (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations')),
  'has_postgis', (SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis'))
);
SQL
)

echo "[INFO] Validation result: $VALIDATION"

# Parse and check results
TABLE_COUNT=$(echo "$VALIDATION" | python3 -c "import json,sys; print(json.load(sys.stdin)['table_count'])")
HAS_MIGRATIONS=$(echo "$VALIDATION" | python3 -c "import json,sys; print(json.load(sys.stdin)['has_prisma_migrations'])")

FAILED=0

if [ "$TABLE_COUNT" -lt 10 ]; then
  echo "[FAIL] Expected at least 10 tables, got $TABLE_COUNT"
  FAILED=1
else
  echo "[PASS] Table count: $TABLE_COUNT"
fi

if [ "$HAS_MIGRATIONS" != "True" ] && [ "$HAS_MIGRATIONS" != "true" ]; then
  echo "[FAIL] Prisma migrations table not found"
  FAILED=1
else
  echo "[PASS] Prisma migrations table present"
fi

# ─── Test a query against core tables ────────────────────

CORE_TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d "$PG_DB" -t -A <<'SQL'
SELECT string_agg(table_name, ',') FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('User', 'Workout', 'Exercise', 'CardioSession', 'BodyMetric', 'PersonalRecord', 'DeviceConnection');
SQL
)

EXPECTED_CORE=("User" "Workout" "Exercise" "CardioSession" "BodyMetric" "PersonalRecord" "DeviceConnection")
for table in "${EXPECTED_CORE[@]}"; do
  if echo "$CORE_TABLES" | grep -q "$table"; then
    echo "[PASS] Core table exists: $table"
  else
    echo "[FAIL] Missing core table: $table"
    FAILED=1
  fi
done

# ─── Result ──────────────────────────────────────────────

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "[SUCCESS] Backup verification passed — $LATEST is restorable"
  exit 0
else
  echo "[FAILURE] Backup verification failed — check output above"
  exit 1
fi
