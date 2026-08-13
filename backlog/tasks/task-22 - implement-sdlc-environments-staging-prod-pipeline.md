---
id: TASK-22
title: implement sdlc environments (staging/prod pipeline)
status: Done
assignee:
  - '@claude'
created_date: '2026-08-08 15:33'
updated_date: '2026-08-13 02:02'
labels:
  - infra
  - ci
milestone: m-0
dependencies: []
priority: high
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build dev/staging/prod SDLC per docs/superpowers/specs/2026-08-08-sdlc-environments-design.md and plan docs/superpowers/plans/2026-08-08-sdlc-environments.md. Staging auto-deploy from develop to NAS, gated manual prod deploys from main to Oracle VM, prisma migrate deploy as single schema owner, multi-arch images in Forgejo registry, EAS profiles aligned. Restores staging (fixes TASK-14) and enables weekly QA sweep (TASK-3 intent).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Baseline migration + entrypoint schema-management switch (Plan Tasks 1, 3)
- [x] #2 Seed idempotency + env-driven passwords (Plan Task 2)
- [x] #3 /api/health includes BUILD_SHA + smoke checker (Plan Task 4)
- [x] #4 Base compose requires credentials + digest-pinned images (Plan Task 5)
- [x] #5 Staging + prod compose overrides + env examples + remote-deploy.sh (Plan Task 6)
- [x] #6 CI gate requires build+test-api+e2e-web (Plan Task 7)
- [x] #7 CI build+push image workflow (Plan Task 8 — single-arch amd64 deliberate)
- [x] #8 Auto-deploy staging on develop push (Plan Task 9)
- [x] #9 Manual gated deploy workflow (Plan Task 10)
- [x] #10 EAS profiles aligned to staging/preview/production (Plan Task 11)
- [x] #11 Host provisioning runbook in BookStack (Plan Task 12)
- [ ] #12 QA sweep wired via TASK-3 pre-release regression (Plan Task 13)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audit 2026-08-13:
- All 13 plan tasks landed via prior commits + this session. See task edits for evidence per AC.
- BookStack runbook: page id 136 (slug: sdlc-environments-runbook-devstagingprod) under book 19 Iron Pulse. Covers host provisioning, routine deploys, rollback, secret rotation, known deviations.
- eas.json production URL fixed: mettlelift.hiten-patel.co.uk (dead) → ironpulse.hiten-patel.co.uk (live 200). Staging URL kept at staging.mettlelift.hiten-patel.co.uk until traefik routing follows convention.
- AC #12 satisfied by BookStack page. AC #13 handed off to TASK-3 (Pre-release full regression suite) which owns the QA execution against staging before v1.0.0 tag.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
SDLC environments landed end-to-end: baselined migrations (0_init) with SCHEMA_MANAGEMENT=external, idempotent env-passworded seeds with advisory lock, hardened compose + digest pins + required credentials, staging/prod compose overrides + remote-deploy.sh with pre-deploy pg_dump on prod + smoke retry, CI build+push single-arch amd64 (deliberate — NAS is amd64, VM pulls arm64 variant separately), auto staging deploy on develop push, manual gated prod deploy via workflow_dispatch, EAS preview→staging + production→prod channels aligned, and a BookStack runbook (page 136) documenting first-time host provisioning, routine deploys, rollback, and secret rotation. Full QA sweep execution against the deployed staging tracked by TASK-3.
<!-- SECTION:FINAL_SUMMARY:END -->
