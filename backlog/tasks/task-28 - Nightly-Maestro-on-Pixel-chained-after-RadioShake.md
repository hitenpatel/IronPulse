---
id: TASK-28
title: Nightly Maestro on Pixel (chained after RadioShake)
status: To Do
assignee: []
created_date: '2026-08-11 07:24'
updated_date: '2026-08-12 15:48'
labels:
  - ci
  - mobile
  - e2e
  - testing
dependencies: []
priority: high
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mirror RadioShake's maestro-nightly.yml pattern for Zor (IronPulse mobile).

Constraints:
- Runs overnight only, on user's Pixel 9 Pro XL (Tailscale ADB @ 100.69.203.52:5555). Same runner as RadioShake — Oracle arm-vm.
- Skip run when HEAD unchanged since last successful scheduled run (same 'changes' preflight job as RS).
- Coordinate with RS via /tmp/pixel-e2e-lock: wait if owner=radioshake or an RS maestro process is running; then claim owner=zor. Release owner=zor on exit.
- Schedule: 03:30 UTC daily. RS runs 01:00 UTC; both wait on the lock so overlap is safe either way.

Build strategy (open question):
1. EAS cloud e2e build on trigger — simplest, slow (~15min), burns credits.
2. Local expo prebuild + gradle assembleE2eDebug on the runner — recommend, mirrors RS.
3. Reuse latest published EAS e2e artifact — skips build entirely.

API URL: override EXPO_PUBLIC_API_URL to https://staging.mettlelift.hiten-patel.co.uk for nightly (eas.json e2e currently targets dev LAN 100.113.79.51:3000).

Flow structure: 45 flat flows in apps/mobile/e2e + 3 in apps/mobile/e2e-smoke. Reorganize into tier1-smoke / tier2-features / tier3-deep to mirror RS staged failure isolation.

Reference: /home/ubuntu/dev/RadioShake/.forgejo/workflows/maestro-nightly.yml. Copy adb setup, PIN entry, locale save/restore, media mute, lock coordination, results ingest, change-detection preflight verbatim; swap gradle target + package id (com.mettlelift.app.e2e) + flow paths.
<!-- SECTION:DESCRIPTION:END -->
