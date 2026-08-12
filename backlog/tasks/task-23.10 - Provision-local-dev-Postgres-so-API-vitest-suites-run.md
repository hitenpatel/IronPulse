---
id: TASK-23.10
title: Provision local dev Postgres so API vitest suites run
status: Done
assignee:
  - '@claude'
created_date: '2026-08-12 17:20'
updated_date: '2026-08-12 21:16'
labels:
  - api
  - infra
  - testing
milestone: m-0
dependencies: []
parent_task_id: TASK-23
type: chore
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root .env DATABASE_URL points at postgresql://zor:zor@localhost:5432/zor but nothing binds host port 5432. The only running Postgres container (ironpulse-production-postgres) exposes 5432/tcp internally only, and it holds real production data. 17 packages/api test files fail at Prisma init before running any assertion.

Options: add a docker-compose.dev.yml service that binds a fresh zor DB on host 5432; or expose the prod container's port (unsafe); or add a per-test disposable container spawn hook. Design and pick, then get pnpm --filter @zor/api test to green.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm --filter @zor/api test exits 0 without touching production data
- [x] #2 Local dev DB is disposable and can be reset via a documented one-liner
- [x] #3 CI already has its own DB per the mobile CI plan — this ticket is dev-machine only
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Dev overlay docker/docker-compose.dev.yml already binds postgres:5432. Bring up: docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d postgres. Then apply prisma migrations (packages/db) against DATABASE_URL=postgresql://zor:zor@localhost:5432/zor, seed a minimal fixture, and rerun pnpm --filter @zor/api test to green.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified 2026-08-12:
- Root .env: added POSTGRES_USER/PASSWORD/DB=zor, MINIO_ROOT_USER/PASSWORD=minioadmin, STRIPE_SECRET_KEY=sk_test_dummy_for_vitest (required by getStripe's env-presence guard even when tests mock the stripe SDK).
- docker/docker-compose.dev.yml already binds postgres to host :5432 with sablier idle group. Bring-up: docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d postgres.
- Created scripts/dev-db.sh with 'start' and 'reset' modes. Applies prisma db push --skip-generate against DATABASE_URL=postgresql://zor:zor@localhost:5432/zor. Reset: scripts/dev-db.sh reset (drops docker_pgdata volume, recreates container, reapplies schema).
- pnpm --filter @zor/api test: 55 files / 666 tests all green (was 55 / 17 file-init failures pre-fix).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Provisioned local dev Postgres via docker/docker-compose.dev.yml overlay (bound to :5432, disposable pgdata volume). Added scripts/dev-db.sh with idempotent start and 'reset' subcommand for one-liner wipe+reprovision. Populated missing compose env vars in root .env (POSTGRES_*, MINIO_ROOT_*, STRIPE_SECRET_KEY). Verified pnpm --filter @zor/api test exits 0 (55/55 files, 666/666 tests). Production postgres container untouched.
<!-- SECTION:FINAL_SUMMARY:END -->
