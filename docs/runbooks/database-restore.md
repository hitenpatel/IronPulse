# Database Restore Runbook

## Prerequisites
- Access to the Docker host
- Backup file available in the `backups` volume

## List Available Backups
docker compose -f docker/docker-compose.yml exec backup ls -lh /backups/

## Restore from Backup
1. Stop the app: `docker compose -f docker/docker-compose.yml stop app`
2. Run restore: `docker compose -f docker/docker-compose.yml exec backup /bin/sh /restore.sh /backups/<filename>.sql.gz`
3. Start the app: `docker compose -f docker/docker-compose.yml start app`

## Manual Backup
docker compose -f docker/docker-compose.yml exec backup /backup.sh
