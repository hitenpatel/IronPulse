#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Available backups:"
  ls -lh /backups/ironpulse_*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

echo "WARNING: This will drop and recreate the database!"
echo "Restoring from: $1"
echo "Press Ctrl+C to cancel, or wait 5 seconds..."
sleep 5

gunzip -c "$1" | PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "${POSTGRES_HOST:-postgres}" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean --if-exists \
  --no-owner

echo "Restore complete."
