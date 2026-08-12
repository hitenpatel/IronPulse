---
id: TASK-23.11
title: 'Stand up a dev API + seeded auth for mobile E2E on 100.113.79.51:3000'
status: To Do
assignee: []
created_date: '2026-08-12 20:09'
labels:
  - api
  - infra
  - testing
  - mobile
milestone: m-0
dependencies: []
parent_task_id: TASK-23
type: feature
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The E2E APK (com.ironpulse.app.e2e, EAS profile e2e) is hardcoded to EXPO_PUBLIC_API_URL=http://100.113.79.51:3000 (this Oracle VM's tailscale IP). Nothing currently binds :3000. Nightly maestro flows get past login UI (verified 2026-08-12 by TASK-23.8) but no session is created so post-login assertions fail.

Provide a persistent dev API at :3000 with a seeded user (test@example.com / password123) whose login lands the greeting id. Should not touch production data. Likely reuses TASK-23.10's dev Postgres provisioning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 curl http://100.113.79.51:3000/api/health returns 200
- [ ] #2 POST http://100.113.79.51:3000/api/auth/callback/credentials with test@example.com/password123 creates a session cookie
- [ ] #3 Full maestro auth-signin flow via nightly-e2e.sh main suite passes end-to-end
<!-- AC:END -->
