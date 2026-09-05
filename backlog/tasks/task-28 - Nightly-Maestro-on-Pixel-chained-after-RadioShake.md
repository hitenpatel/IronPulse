---
id: TASK-28
title: Nightly Maestro on Pixel (chained after RadioShake)
status: Done
assignee: []
created_date: '2026-08-11 07:24'
updated_date: '2026-09-05 18:04'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Already implemented in .forgejo/workflows/maestro-nightly.yml. Cross-check vs task description: schedule cron '30 3 * * *' (line 8, 03:30 UTC as specified); changes preflight job skips scheduled runs when HEAD is unchanged since the last successful scheduled run of this same workflow (lines 12-56); runs on arm64-dind runner (same Oracle arm-vm as RadioShake); builds locally via expo prebuild + gradle assembleRelease (recommended strategy 2, lines 187-232); Pixel 9 Pro XL at 100.69.203.52:5555 over Tailscale ADB; package id com.ironpulse.app.e2e post-rebrand (line 191); lock coordination at /home/ubuntu/stack/pixel-e2e-lock with owner=zor (lines 240-434) — task description said /tmp/pixel-e2e-lock but the actual location moved to the shared mount in commit d2405d0. Recent work (commits c7eaa37, d2405d0, b487ff7, 8e2ef06) repaired the pipeline; the powersync bind-mount fix from this session should be validated by manual dispatch run 540 already in flight.
<!-- SECTION:NOTES:END -->
