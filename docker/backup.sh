#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_FILE="$BACKUP_DIR/ironpulse_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "${POSTGRES_HOST:-postgres}" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -Fc \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup saved to $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Retention: keep last 30 daily backups
find "$BACKUP_DIR" -name "ironpulse_*.sql.gz" -mtime +30 -delete
echo "[$(date)] Old backups cleaned up (30-day retention)"
