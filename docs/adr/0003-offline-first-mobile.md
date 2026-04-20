# 0003. Offline-first mobile architecture

- **Status:** Accepted
- **Date:** 2026-01-18
- **Deciders:** @hiten

## Context

Core IronPulse use cases happen in gyms, on runs, in fields — places with unreliable or no internet:

- Logging a set mid-workout must never wait for a round-trip.
- GPS cardio must record a full session with zero signal and sync it hours later.
- Reading history, templates, and exercise library must work on airplane mode.

Network-first UX (loader → fetch → render) fails all three. We need a local-first model where the UI reads from a persistent local store and the network is a background concern.

## Decision

Adopt an **offline-first** architecture on mobile:

1. **Local store = SQLite** (via PowerSync; see ADR 0001). All read queries hit SQLite, never the network.
2. **Writes go to tRPC mutations** over the network with an offline-aware retry queue (see `apps/mobile/lib/trpc.ts` + `@tanstack/react-query` mutation retry).
3. **PowerSync propagates server state back** to the device on any connection — the UI re-renders from the updated local row.
4. **Conflict resolution:** last-write-wins at the row level, enforced by `updated_at` timestamps. Workout and cardio sessions are append-only at the granular (`exercise_sets`, `laps`) level, so real conflicts are rare.
5. **User-scoped replication:** `sync_rules.yaml` replicates only rows with `user_id = $auth_user_id`. A device can't see another user's rows even if misconfigured queries ask for them.

## Consequences

### Good

- UI is always instant — no spinner on list screens.
- A full workout can be logged, completed, and reviewed with zero connectivity.
- Server outages don't block the gym workflow.
- Re-installs restore state automatically on next sync (server is the source of truth).

### Bad

- Every new mobile feature must think about both the online and offline path.
- SQLite schema must stay in lockstep with Postgres via Prisma migrations + `sync_rules.yaml` updates — a missed rule is a silent sync gap (happened twice before rc.5).
- Debugging "why doesn't my row show up on the other device?" spans three systems: Postgres, PowerSync, SQLite.

### Neutral

- Tests have to cover both reads-from-local-SQLite and writes-via-tRPC paths.
- The mobile app ships a non-trivial database runtime.

## Alternatives considered

- **Network-first with an LRU cache** — rejected: fails the core gym use case.
- **Manual sync button** — rejected: users will forget.
- **Optimistic UI + retry queue, no local DB** — rejected: solves writes but not reads; history and templates still need the network on cold start.

## Follow-ups

- Sync rules live in `packages/db/prisma/sync_rules.yaml`. Any new synced table must add an entry there.
- The mobile PowerSync auth token is issued by `/api/auth/powersync/keys`. See ADR 0004 for the broader auth strategy.
