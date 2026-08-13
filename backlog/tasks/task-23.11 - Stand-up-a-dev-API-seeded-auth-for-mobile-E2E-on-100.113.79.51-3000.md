---
id: TASK-23.11
title: 'Stand up a dev API + seeded auth for mobile E2E on 100.113.79.51:3000'
status: Done
assignee:
  - '@claude'
created_date: '2026-08-12 20:09'
updated_date: '2026-08-13 05:36'
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
- [x] #1 curl http://100.113.79.51:3000/api/health returns 200
- [x] #2 POST http://100.113.79.51:3000/api/auth/callback/credentials with test@example.com/password123 creates a session cookie
- [x] #3 Full maestro auth-signin flow via nightly-e2e.sh main suite passes end-to-end
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified 2026-08-13:
- AC #1: curl http://100.113.79.51:3000/api/health returns 200. Dev API (Next.js turbopack) running via pnpm dev; postgres + redis brought up via docker/docker-compose.dev.yml overlay. S3 is degraded (MinIO port 9000 is bound by paperless-rag python service, cannot rebind) but health endpoint treats S3 as optional and returns 200 when db+redis are ok (per health/route.ts line 53).
- AC #2: CSRF fetch + POST /api/auth/callback/credentials with test@example.com/password123 (seeded via packages/db/seeds/seed-dev.ts) returns 302 + authjs.session-token cookie. Session token verified in cookie jar.
- Fixed dangling /home/hitenpatel/... symlink at apps/web/.env → now points at /home/ubuntu/dev/IronPulse/.env.
- Systemd user service /home/ubuntu/.config/systemd/user/zor-dev-api.service registered + enabled (linger=yes, survives logout). Brings up postgres+redis then runs pnpm dev. Not started in this session because a transient pnpm dev is already holding :3000; will pick up on next boot / when transient dies.

AC #3 (full maestro suite E2E) BLOCKED by external device state: Pixel 100.69.203.52 is tailscale-reachable (ping ok) but adb-over-wifi on :5555 returns 'Connection refused'. Wireless debugging needs to be re-enabled from the device (Settings → Developer options → Wireless debugging, or reissue 'adb tcpip 5555' from USB). Once device is back, rerun: cp apps/mobile/e2e/auth-signin.yaml /tmp/zor-e2e-run/ && sed -i 's/^appId: com.ironpulse.app$/appId: com.ironpulse.app.e2e/' /tmp/zor-e2e-run/auth-signin.yaml && maestro --device 100.69.203.52:5555 test /tmp/zor-e2e-run/auth-signin.yaml

Session 2026-08-13: Pixel 100.69.203.52 tailscale-ok but adb :5555 Connection refused throughout. Cannot verify device-bound ACs this session. Reconnect steps: from device, Settings → System → Developer options → Wireless debugging toggle off/on; OR plug USB and run 'adb tcpip 5555' then unplug. After that, adb connect 100.69.203.52:5555 from this VM. Then rerun the relevant maestro suite.

AC#3 verified 2026-08-13: reconnected device via adb tcpip 5555 (pinned port), fixed 'Invalid credentials' root cause (api test suites had wiped dev DB seed users — reseeded seed.ts + seed-dev.ts; auth.mobileSignIn curl returns JWT). Full maestro auth-signin flow passed on device: launchApp clearState/clearKeychain → email/password input → login-button → greeting visible. Exit 0.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Dev API on :3000 with seeded auth for mobile E2E. Health 200 (db+redis via docker overlay; S3 optional), credentials login creates session, and full maestro auth-signin flow passes on-device against the e2e APK. Root-caused two blockers: bundle-ID drift (rebuilt e2e APK from app.config.js) and test-suite DB wipes (reseeded). systemd user service zor-dev-api.service registered for persistence.
<!-- SECTION:FINAL_SUMMARY:END -->
