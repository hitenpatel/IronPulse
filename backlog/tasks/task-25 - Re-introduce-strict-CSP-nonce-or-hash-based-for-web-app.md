---
id: TASK-25
title: Re-introduce strict CSP (nonce or hash-based) for web app
status: Done
assignee: []
created_date: '2026-08-09 06:07'
updated_date: '2026-08-11 07:21'
labels:
  - security
  - web
dependencies: []
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #444 shipped script-src 'nonce-...' 'strict-dynamic' in middleware, but /login, /signup, /onboarding and other pages are statically prerendered — their HTML cannot carry a per-request nonce, so browsers blocked every script and the app never hydrated (found when the SDLC pipeline made the Playwright gate blocking, 2026-08-09). Middleware was reverted to script-src 'self' 'unsafe-inline' (matches long-running prod behaviour).

Proper fix options: force dynamic rendering for all pages and propagate the nonce via request CSP header per Next.js docs, or generate a hash-based policy at build time. Must include an E2E assertion that pages still hydrate under the new policy.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
cancelled — leaving uptime monitoring with existing Kuma setup, no per-endpoint monitors added
<!-- SECTION:NOTES:END -->
