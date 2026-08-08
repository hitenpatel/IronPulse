# SDLC Environments Design — Zor

**Date:** 2026-08-08
**Status:** Draft for review
**Related backlog:** Task-14 (staging health check broken), Task-3 (pre-release regression suite). Task-20 (mobile server picker) explicitly out of scope.

## Problem

Zor currently has no real environment separation. Forgejo CI validates (lint, typecheck, unit, API, Playwright, Lighthouse) but deploys nothing. The staging deploy job was removed in May 2026 and `staging.ironpulse.hiten-patel.co.uk` has returned 404 since (Task-14). Production is a single Docker Compose stack whose entrypoint runs `prisma db push` — no migration history is applied in production, and destructive schema changes can slip through silently. Mobile builds bake the production API URL at build time with no staging target.

## Goals

- Three distinct environments: dev (local), staging (NAS), prod (Oracle VM).
- Automated staging deploys from `develop`; gated manual prod deploys from `main`.
- Production-safe database schema management via `prisma migrate deploy`.
- Mobile EAS profiles aligned to environments.
- Domain move to `zor.*` as part of the rebrand.

## Non-goals

- Task-20 runtime server picker.
- Blue/green deploys, Kubernetes, autoscaling.
- iOS App Store submission flow.

## Environment topology

| Env | Host | Arch | Domain | Database |
|---|---|---|---|---|
| dev | local machine (`docker-compose.dev.yml` / `pnpm dev`) | any | `localhost:3000` | local Postgres, `prisma db push` |
| staging | Synology NAS (192.168.1.24) | amd64 | `staging.zor.hiten-patel.co.uk` | dedicated Postgres stack, `prisma migrate deploy` |
| prod | Oracle ARM VM (140.238.98.35) | arm64 | `zor.hiten-patel.co.uk` | dedicated Postgres stack, `prisma migrate deploy` |

Each environment is a fully separate Compose stack (app, Postgres/PostGIS, Redis, MinIO) with its own secrets and volumes. No shared state between environments.

`ironpulse.hiten-patel.co.uk` serves a 301 redirect to `zor.hiten-patel.co.uk` after cutover.

## Branch and release flow

1. Feature branches → PR to `develop`. Existing CI suite is the merge gate (unchanged).
2. Merge to `develop`:
   - CI builds a multi-arch image (`linux/amd64,linux/arm64`) with `docker buildx` + QEMU.
   - Pushes to Forgejo container registry as `git.hiten-patel.co.uk/hiten/ironpulse:staging-<sha>` and `:staging-latest`.
   - Deploy job SSHes to the NAS: `docker compose pull && docker compose up -d`.
   - Post-deploy smoke test runs against staging (health endpoint, login, one write path). This closes Task-14.
3. PR `develop` → `main`; on merge CI builds and pushes `:prod-<sha>` and `:prod-latest`. **No auto-deploy.**
4. Prod deploy is manual: a `workflow_dispatch` job (or an operator-run deploy script) that:
   - takes a pre-deploy `pg_dump`,
   - pulls the chosen image tag on the VM,
   - runs `prisma migrate deploy`,
   - `docker compose up -d`,
   - runs the smoke test.
5. Rollback: redeploy the previous `prod-<sha>` tag; restore the pre-deploy dump if a migration was involved.

## Deploy mechanism

- CI runner (arm64, Oracle VM) builds multi-arch images via buildx/QEMU. The amd64 half is emulated and slow; mitigated with registry layer caching (`--cache-to/--cache-from` on the Forgejo registry).
- Per-env compose override files in the repo: `docker/compose.staging.yml` and `docker/compose.prod.yml` (image tag variable, port bindings, env-file path). Base `docker-compose.yml` stays shared.
- CI secrets: Forgejo registry credentials plus SSH deploy keys for the NAS and the prod VM.

## Database strategy

- Entrypoint gains a `MIGRATE_MODE` switch: `push` (default, dev behaviour unchanged) or `deploy` (runs `prisma migrate deploy`; set in staging/prod compose overrides).
- One-time baseline: mark the 16 existing migrations as applied on the current prod DB with `prisma migrate resolve --applied`.
- The backup profile (nightly `pg_dump`) becomes mandatory on prod; every prod deploy additionally takes an ad-hoc pre-deploy dump.
- Seeding: `seed.ts` (reference data) runs everywhere. `seed-dev.ts` (test users) runs in dev and staging only — staging needs the test users for E2E; prod never gets them.

## Mobile (Expo EAS)

- `preview` profile: `EXPO_PUBLIC_API_URL=https://staging.zor.hiten-patel.co.uk`, EAS Update channel `staging`.
- `production` profile: `EXPO_PUBLIC_API_URL=https://zor.hiten-patel.co.uk`, channel `production`.
- `lib/config.ts` fallback URL updated from the ironpulse domain to `https://zor.hiten-patel.co.uk`.
- `e2e` profile unchanged (Tailscale IP target).

## Configuration and secrets

- Per-env `.env` files live on each host, outside git.
- Repo documents required variables via `.env.staging.example` and `.env.prod.example`.
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, DB/Redis/MinIO credentials unique per environment.

## Testing gates

- Merge gate: existing CI suite (unchanged).
- New post-deploy smoke test script (staging auto, prod manual step): `/api/health`, authenticated login, one write round-trip. Script logic gets unit tests; the script is exercised end-to-end by the first staging deploy.
- Weekly scheduled Playwright run against staging (`BASE_URL=https://staging.zor.hiten-patel.co.uk`) to cover Task-3's pre-release regression intent.

## Rollback and monitoring

- Images immutably tagged by commit sha; rollback is a documented one-line redeploy of a prior tag.
- Uptime Kuma monitors `/api/health` on both staging and prod.

## Risks

- QEMU amd64 builds on the arm64 runner may be slow (est. 10–20 min). Acceptable for staging cadence; revisit with a native amd64 runner on the NAS if painful.
- Domain cutover requires coordinated DNS, reverse-proxy, `NEXTAUTH_URL`, and mobile rebuild changes; sequenced in the implementation plan.
- `migrate deploy` baseline must be done carefully against a fresh prod backup.
