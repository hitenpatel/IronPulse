---
id: TASK-20
title: >-
  feat(mobile): runtime server picker — point the published APK at any
  self-hosted instance
status: To Do
assignee: []
created_date: '2026-07-24 05:59'
updated_date: '2026-07-24 06:07'
labels:
  - agent-ready
  - feature
  - mobile
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/450'
priority: medium
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #450: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/450

## Motivation

Today `apps/mobile/lib/config.ts` bakes `API_URL` from `process.env` at bundle time and defaults to the managed cloud URL. The published Play Store / TestFlight APK therefore can't connect to a self-hosted instance — operators have to fork and rebuild with `EXPO_PUBLIC_API_URL=...`.

This blocks the self-host-first launch strategy: we want a single APK that prompts "Use IronPulse Cloud" or "Connect to my server" on first launch.

## Acceptance criteria

- [ ] First-launch flow: new screen at `(auth)/server-picker.tsx` with three actions — Use Cloud / Self-hosted (enter URL) / Learn more (opens docs)
- [ ] URL validator hits `GET <url>/api/health` with a 10s timeout, surfaces specific error states (unreachable, TLS, wrong shape, timeout)
- [ ] Server URL persists in `SecureStore` under key `server-url`
- [ ] `lib/trpc.ts` and `lib/powersync.ts` read URL dynamically via `getApiUrl()` — no more module-load constants
- [ ] PowerSync connector reinitialises when server URL changes
- [ ] `Settings → Server` entry to change server later (warns: local cache cleared, signs user out)
- [ ] Backwards compat: users with `auth-token` in SecureStore but no `server-url` default to the current cloud URL (no disruption)
- [ ] Maestro E2E flow covering picker + cloud path
- [ ] End-to-end smoke against a fresh `docker compose up` instance on a separate host

## Implementation plan

### New files

- `apps/mobile/lib/server.ts` — in-memory cache + `getApiUrl()` / `setApiUrl(url)` / `hydrateServerUrl()` (call before render)
- `apps/mobile/app/(auth)/server-picker.tsx` — first-launch UI
- `apps/mobile/app/settings/server.tsx` — change-later UI

### Modified files

- `apps/mobile/lib/config.ts` — expose `DEFAULT_API_URL` only; remove module-load `API_URL` constant
- `apps/mobile/lib/trpc.ts` — `httpBatchLink({ url: () => \`${getApiUrl()}/api/trpc\` })`
- `apps/mobile/lib/powersync.ts` — lazy-init connector; expose reinit hook
- `apps/mobile/lib/auth.tsx` — `signOut()` preserves `server-url`
- `apps/mobile/App.tsx:348` — gate before `needsAuth`: if no server URL, render ServerPicker

### Validator error states

| Failure | Message |
|---|---|
| Missing scheme | (auto-prefix https) |
| Non-200 from /api/health | "Couldn't reach that address" |
| 200 but unexpected JSON shape | "Doesn't look like an IronPulse server" |
| TLS error | "TLS error — for local dev, set up Caddy with a real cert" |
| Timeout (10s) | "Server didn't respond — check the URL and try again" |

## Effort estimate

~24 hours / 3 dev days

| Slice | Hours |
|---|---|
| `lib/server.ts` + hydration + validator | 4 |
| Refactor `trpc.ts` + `powersync.ts` for dynamic URL | 4 |
| ServerPickerScreen UI + flow | 6 |
| Settings entry + change-server flow | 3 |
| Backwards compat + tests | 3 |
| Maestro e2e covering picker | 2 |
| Validate end-to-end against fresh docker compose | 2 |

## Out of scope (separate tickets)

- Federation between instances (social feed across servers)
- Per-instance push notification setup — operator BYOs Expo project keys, doc it
- Native Apple Watch companion (currently #384/385/386)

## Blocks

Self-host-first public launch. The web app already works on mobile responsively, so this is the last piece for "one published APK, BYO backend".
<!-- SECTION:DESCRIPTION:END -->
