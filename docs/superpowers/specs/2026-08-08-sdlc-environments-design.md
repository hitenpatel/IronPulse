# SDLC Environments Design — Mettle Lift / Zor

**Date:** 2026-08-08 (rev 2, after Codex cross-model review)
**Status:** Draft for review
**Related backlog:** Task-14 (staging health check broken), Task-3 (pre-release regression suite). Task-20 (mobile server picker) out of scope.

## Problem

No real environment separation exists. Forgejo CI validates but deploys nothing; the `ci-gate` job only requires `build` — API tests, Playwright E2E, and Lighthouse are advisory. The staging deploy job was removed in May 2026 and staging has returned 404 since (Task-14). Production is a single Docker Compose stack whose entrypoint runs `prisma db push` — no migration history applied in production. Mobile builds bake the API URL at build time with no staging target.

## Goals

- Three distinct environments: dev (local), staging (NAS), prod (Oracle VM).
- Automated staging deploys from `develop`; gated manual prod deploys from `main`.
- Migration-based schema management (`prisma migrate deploy`) with a working fresh-database bootstrap.
- Deploys pinned to immutable image tags; verifiable post-deploy.
- Mobile EAS profiles aligned to environments.

## Non-goals

- **Domain cutover to `zor.*`** — split into a separate, reversible release alongside the rebrand. This design ships on existing `mettlelift.hiten-patel.co.uk` domains.
- Task-20 runtime server picker.
- Blue/green, Kubernetes, autoscaling, iOS App Store flow.
- Off-host encrypted backup storage (follow-up; nightly + pre-deploy dumps are the accepted baseline).

## Environment topology

| Env | Host | Arch | Domain | Schema mgmt |
|---|---|---|---|---|
| dev | local (`docker-compose.dev.yml` / `pnpm dev`) | any | `localhost:3000` | `prisma db push` |
| staging | Synology NAS (192.168.1.24) | amd64 | `staging.mettlelift.hiten-patel.co.uk` | `migrate deploy` (deploy job only) |
| prod | Oracle ARM VM (140.238.98.35) | arm64 | `mettlelift.hiten-patel.co.uk` | `migrate deploy` (deploy job only) |

Each environment is a fully separate Compose stack (app, Postgres/PostGIS, Redis, MinIO) with its own secrets and volumes. No shared state.

**Known accepted risk:** the CI runner lives on the prod Oracle VM, so CI executes repository code adjacent to the prod Docker daemon. Accepted for a single-operator project with a private Forgejo (third-party PRs limited to Renovate). Revisit if collaborators are added.

## Branch and release flow

1. Feature branches → PR to `develop`. Merge gate: `ci-gate` is **tightened to require `test-api` and `e2e-web`** in addition to `build` (Lighthouse stays advisory).
2. Merge to `develop`:
   - CI builds multi-arch image (`linux/amd64,linux/arm64`) via buildx + QEMU, with registry layer cache.
   - Pushes `git.hiten-patel.co.uk/hiten/mettlelift:staging-<sha>` (immutable; no `latest` used for deploys).
   - Deploy job (per-env concurrency group, `cancel-in-progress: false`) SSHes to the NAS, writes the target sha into the env file, runs `prisma migrate deploy` (one owner — see Database), then `docker compose up -d`.
   - Post-deploy smoke test verifies `/api/health` reports the **deployed sha**, plus login and one write round-trip. Closes Task-14.
3. PR `develop` → `main`; on merge CI builds and pushes `prod-<sha>`. **No auto-deploy.**
4. Prod deploy is a manual `workflow_dispatch` job taking an explicit sha input:
   - pre-deploy `pg_dump` (verified non-empty before proceeding),
   - `prisma migrate deploy`,
   - `docker compose up -d` with the pinned sha,
   - smoke test against prod verifying the sha.
   - Any step failure aborts and leaves prior containers running; migration failure = restore decision point (see Rollback).
5. Rollback contract (honest version):
   - **App-only change:** redeploy previous `prod-<sha>` — one command, safe.
   - **After a migration:** restoring the pre-deploy dump loses all writes since the dump; MinIO/Redis state is not rolled back. Therefore migrations follow **expand/contract**: additive first, destructive cleanup only after the release is proven, so old images stay compatible and app-only rollback remains possible.

## Deploy mechanism

- Per-env compose overrides in repo: `docker/compose.staging.yml`, `docker/compose.prod.yml` (image tag var, ports, env-file path).
- **All infra images pinned by digest** (Postgres/PostGIS, Redis, MinIO, PowerSync, Mongo) — `docker compose pull` must never change infrastructure independently of a release. Renovate proposes digest bumps.
- CI secrets: Forgejo registry credentials, SSH deploy keys for NAS and prod VM.
- `/api/health` extended to return the build sha (injected at image build); smoke tests assert it matches the deployed tag.

## Database strategy

- **Single migration owner:** only the deploy job runs `prisma migrate deploy`. The entrypoint's schema step (`db push` + publication) is disabled in staging/prod via env flag; dev behaviour unchanged.
- **Fresh-database bootstrap (prerequisite):** the migration history lacks an initial schema migration — `migrate deploy` cannot build an empty database today (documented in `docker/entrypoint.sh`). Fix: generate a baseline `0_init` migration from the current schema, then prove `migrate deploy` + app start succeed against an **empty PostGIS database** before any environment switches over.
- **Prod baseline:** with a fresh verified backup taken first, `prisma migrate resolve --applied` marks history as applied on the existing prod DB.
- Backups: nightly `pg_dump` profile mandatory on prod; ad-hoc pre-deploy dump on every prod deploy.
- **Seeding:** `seed.ts` (reference data) runs on deploy, made idempotent under concurrent start (unique-key upsert, not `findFirst`+create). `seed-dev.ts` currently appends workout/cardio/sleep rows on every run — gated to run **once** per environment (marker row), dev and staging only, never prod.
- Staging test accounts keep documented emails but take passwords from a staging env var — not the hardcoded `password123`.

## Mobile (Expo EAS)

- `preview` profile: `EXPO_PUBLIC_API_URL=https://staging.mettlelift.hiten-patel.co.uk`, EAS Update channel `staging`.
- `production` profile: `EXPO_PUBLIC_API_URL=https://mettlelift.hiten-patel.co.uk` (already the fallback in `lib/config.ts`), channel `production`.
- `e2e` profile unchanged (Tailscale IP target).
- Acceptance: one preview and one production artifact each verified to contain the intended URL/channel.

## Configuration and secrets

- Base compose currently hard-codes Postgres and MinIO credentials — replaced with **required** env vars (compose fails fast if unset). Per-env `.env` files live on each host, outside git; repo ships `.env.staging.example` / `.env.prod.example`.
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, DB/Redis/MinIO credentials unique per environment.
- Staging carries **no production third-party keys** (Stripe etc. absent or test-mode only).
- Staging is reachable for the weekly QA sweep but not treated as public: known test accounts + env-var passwords; access restriction (proxy basic-auth or IP allowlist) decided at implementation.

## Testing gates

- Merge gate: tightened `ci-gate` (build + test-api + e2e-web).
- Post-deploy smoke (staging auto, prod manual step): health-with-sha, authenticated login, one write round-trip using generated unique test data with cleanup; bounded timeouts; no billing/email side effects. Smoke script logic unit-tested.
- Weekly staging regression: **reuse the existing QA sweep defined in `test-paths.md`** (already targets `staging.mettlelift.hiten-patel.co.uk`) — no second competing suite. Restoring staging un-breaks that process and covers Task-3's intent.

## Acceptance criteria

1. Empty PostGIS database: `prisma migrate deploy` completes cleanly and the app starts without `db push`.
2. Prod DB baselined: `prisma migrate status` reports no pending drift; verified backup exists from before baselining.
3. Merge to `develop` results in staging serving that commit's sha at `/api/health` with green smoke, with no manual steps.
4. Two rapid `develop` merges deploy serially in order (concurrency group proven).
5. `workflow_dispatch` prod deploy with a chosen sha: dump taken and verified, migration applied once, sha live, smoke green. Deliberately failing smoke leaves previous release running.
6. Rollback drill: redeploy previous staging sha succeeds in one job run.
7. No `latest` tags anywhere in staging/prod compose files; all images digest- or sha-pinned.
8. Compose refuses to start with missing credentials env vars; no defaults remain in the base file.
9. Staging seed accounts log in with env-provided passwords; `password123` absent from deployed staging.
10. EAS preview + production artifacts verified for URL/channel correctness.
11. Weekly QA sweep (test-paths.md) passes Tier-1 against restored staging.

## Failure behaviour (per deploy step)

| Failure | Behaviour | Alert |
|---|---|---|
| Image pull fails | Abort before migration; previous release untouched | CI job red |
| `migrate deploy` fails | Abort; app not restarted; operator decides restore vs fix-forward | CI job red + Uptime Kuma unaffected |
| `up -d` fails / crash-loop | Previous image still available; redeploy prior sha | Uptime Kuma health alert |
| Smoke fails | Staging: job red, investigate. Prod: documented rollback one-liner | CI job red |
| Concurrent trigger | Second run queues behind first (concurrency group) | — |

## Risks

- QEMU amd64 builds on arm64 runner slow (est. 10–20 min). Acceptable at staging cadence; fallback is a native amd64 runner on the NAS.
- Baseline migration against prod is the highest-risk one-time step; mitigated by verified backup + rehearsal on a prod dump restored into staging.
- Runner-on-prod-VM risk accepted (see topology).
