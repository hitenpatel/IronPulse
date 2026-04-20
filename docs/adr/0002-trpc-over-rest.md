# 0002. tRPC over REST for the internal API

- **Status:** Accepted
- **Date:** 2026-01-14
- **Deciders:** @hiten

## Context

We needed an API layer for the web SPA and the mobile app to talk to the server. Requirements:

- End-to-end type safety — a backend schema change should fail TypeScript on the client.
- Input validation without double-declaring schemas on server and client.
- Monorepo friendly — web, mobile, and API all live in the same pnpm workspace.
- Single-developer project — minimise boilerplate.

We also had 180+ procedures projected across strength, cardio, body metrics, messaging, coaching, integrations, billing, admin.

## Decision

Use **tRPC v11** as the internal API between web/mobile clients and the server. Zod schemas are the single source of truth for input/output validation and type inference.

- All procedures live in `packages/api/src/routers/*` and are composed into `appRouter`.
- Web mounts the router at `/api/trpc/[trpc]/route.ts`.
- Mobile consumes via `@trpc/client` with a Bearer-token link.
- Procedures are built from four base builders: `publicProcedure`, `authRateLimitedProcedure`, `protectedProcedure`, `rateLimitedProcedure` (see `packages/api/src/trpc.ts`).

## Consequences

### Good

- End-to-end types: an input schema change breaks the client at compile time, not at runtime.
- No OpenAPI / codegen step — types flow through TypeScript project references.
- Zod does double duty — validation and type inference from one declaration.
- Developer ergonomics: calling `trpc.workouts.list.useQuery()` in React is one line.

### Bad

- tRPC is opinionated about transport (JSON POST, superjson). A public API gateway or partner integration needs a separate REST facade.
- Route URLs are opaque (`/api/trpc/workouts.list`) — tooling that expects conventional REST paths (e.g. AWS WAF path rules) needs custom configuration.
- Dynamic model access patterns (see `packages/api/src/routers/sync.ts`) can't be fully typed by tRPC — we keep a small typed helper to isolate the cast.

### Neutral

- Version coupling — web and mobile must upgrade the `@trpc/*` family together with server.
- The procedure builder composition (`protected.use(rateLimit)`) is powerful but adds a layer of abstraction for new contributors.

## Alternatives considered

- **Plain REST + OpenAPI codegen** — rejected: ceremony (write Zod schema, map to OpenAPI, regenerate client types). Two sources of truth.
- **GraphQL (Apollo Server + codegen)** — rejected: N+1 avoidance via dataloaders and graph schema stitching were too much ceremony for a single-developer project.
- **Hono + manual typed fetch** — rejected: lose the `.useQuery` / cache-integrated client.
- **tRPC-openapi hybrid** — considered but deferred. If we ever need a public REST gateway, we'll expose a curated subset of procedures via `trpc-openapi` rather than converting wholesale.

## Follow-ups

- Follow-up ADR if we add a public REST surface for third parties.
- `/dev/api-panel` (trpc-ui) serves as interactive documentation — see ADR 0003 for the panel wiring.
