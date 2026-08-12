---
id: TASK-23.10
title: Provision local dev Postgres so API vitest suites run
status: To Do
assignee: []
created_date: '2026-08-12 17:20'
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
- [ ] #1 pnpm --filter @zor/api test exits 0 without touching production data
- [ ] #2 Local dev DB is disposable and can be reset via a documented one-liner
- [ ] #3 CI already has its own DB per the mobile CI plan — this ticket is dev-machine only
<!-- AC:END -->
