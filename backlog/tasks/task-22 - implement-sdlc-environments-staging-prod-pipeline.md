---
id: TASK-22
title: implement sdlc environments (staging/prod pipeline)
status: In Progress
assignee:
  - '@claude'
created_date: '2026-08-08 15:33'
updated_date: '2026-08-08 15:34'
labels: []
dependencies: []
priority: high
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build dev/staging/prod SDLC per docs/superpowers/specs/2026-08-08-sdlc-environments-design.md and plan docs/superpowers/plans/2026-08-08-sdlc-environments.md. Staging auto-deploy from develop to NAS, gated manual prod deploys from main to Oracle VM, prisma migrate deploy as single schema owner, multi-arch images in Forgejo registry, EAS profiles aligned. Restores staging (fixes TASK-14) and enables weekly QA sweep (TASK-3 intent).
<!-- SECTION:DESCRIPTION:END -->
