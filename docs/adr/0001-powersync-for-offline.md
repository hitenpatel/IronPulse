# 0001. PowerSync for offline-first mobile sync

- **Status:** Accepted
- **Date:** 2026-01-12
- **Deciders:** @hiten

## Context

The mobile app must work without internet — gyms often have poor reception — and sync transparently when the network returns. We have:

- A Postgres source of truth on the server.
- A mobile app (React Native, bare CLI) that needs durable local state across 11+ tables.
- Writes that originate on either side: a workout logged offline on mobile must reconcile with a template edited on web.
- GDPR / data portability requirements (user owns their data).

Building a bespoke sync layer means implementing: change tracking, conflict resolution, partial replication, network-aware retry, schema migration for the local DB. That's a multi-quarter build and a maintenance tail.

## Decision

Use **PowerSync** — a service in front of Postgres that replicates a defined subset of rows to SQLite on each client, with an in-app JS SDK that handles bidirectional sync, retry, and conflict resolution.

Implementation:
- `powersync` docker service runs next to Postgres.
- `sync_rules.yaml` defines which tables replicate per user.
- Mobile consumes rows via `@powersync/react-native` (SQLite under the hood).
- Writes still go through tRPC mutations — PowerSync ingests the Postgres change and pushes it to the client. We don't accept writes directly to PowerSync.

## Consequences

### Good

- Real offline-first without us building the sync layer.
- SQLite on-device reads are instant; UI is never in a loading state waiting on the network.
- Sync rules are declarative (`sync_rules.yaml`), versioned with the app.
- Per-user row-level scoping is enforced at the replication layer — defense in depth against a buggy query returning another user's data.

### Bad

- External dependency: if PowerSync's open-source service hits a bug, we have to fix it or work around it.
- Schema changes to synced tables must coordinate with `sync_rules.yaml` — missed updates create silent sync gaps (we've had two of these historically; see rc.5 fix in CHANGELOG).
- Authentication between mobile and PowerSync is separate from NextAuth — we mint a PowerSync JWT per user via `/api/auth/powersync/keys`.

### Neutral

- Extra service to run in Docker Compose.
- Mobile code reads via SQLite queries, not tRPC — slightly different mental model from the web.

## Alternatives considered

- **Hand-rolled sync with PouchDB + CouchDB** — rejected: CouchDB in the stack is another piece to learn and run, and conflict resolution with a merge function is painful to debug.
- **WatermelonDB** — rejected: we'd still have to implement the server side. Strong library, but solves half the problem.
- **REST + optimistic UI + retry queue** — rejected: works for simple CRUD, breaks down with 11 related tables and referential constraints.
- **Firebase Firestore** — rejected: vendor lock-in, data residency uncertainty, and we'd need to dual-write to Postgres for our own analytics.

## Follow-ups

- ADR 0003 (offline-first architecture) expands on the client-side patterns.
- `packages/db/prisma/sync_rules.yaml` is the source of truth for replicated tables.
