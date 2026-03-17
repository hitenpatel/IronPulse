-- Create publication for PowerSync logical replication
-- Requires wal_level=logical in postgresql.conf
-- NOTE: This runs via a post-migration script, not inline, because the tables
-- may not exist yet when this migration runs during a fresh reset.
-- See docker/docker-compose.yml entrypoint for the actual CREATE PUBLICATION.
SELECT 1;
