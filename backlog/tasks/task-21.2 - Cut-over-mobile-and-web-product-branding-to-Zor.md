---
id: TASK-21.2
title: Cut over mobile and web product branding to Zor
status: Done
assignee: []
created_date: '2026-08-08 06:35'
updated_date: '2026-08-08 08:58'
labels: []
dependencies:
  - TASK-21.1
parent_task_id: TASK-21
priority: high
type: feature
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply the canonical Zor identity across mobile, web, PWA, install metadata, accessible labels, permission copy, notifications, and store-facing metadata without redesigning the existing acid-sport UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Installed app label and in-product brand are Zor; store listing title is documented as Zor Fitness
- [x] #2 Mobile, web, PWA, favicon, splash, launcher, social, and theme-specific assets consume the canonical generated identity assets
- [x] #3 Existing bundle identifiers and EAS project ID remain unchanged; zor deep links are added while legacy schemes continue to resolve
- [x] #4 No user-visible Mettle Lift or IronPulse copy remains outside explicitly documented historical contexts
- [ ] #5 Relevant unit, integration, accessibility, build, and visual checks pass or pre-existing failures are separately documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update mobile/web display names, permission strings, notifications, PWA manifest, transactional emails, legal pages. 2. Restore ironpulse-compatible bundle IDs, IAP product IDs, PowerSync DB filename, S3 bucket default. 3. Introduce zor:// as primary deep-link scheme, keep ironpulse:// legacy alias. 4. Extend branding generator with zor-logo-{light,dark}.svg. 5. Regenerate assets + wire mobile SvgXml logo to Zor lockup.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced Mettle Lift copy across 62 TS/TSX files, PWA manifest, all Maestro yaml appIds, nightly-e2e.sh, mobile logo XML, and web logo references. Bundle IDs, IAP IDs, DB filename, and S3 bucket restored to ironpulse-compatible values. Deep-link scheme primary=zor, alias=ironpulse. Branding generator now emits 20 assets (added zor-logo-light.svg and zor-logo-dark.svg). pnpm branding:generate and branding:check pass. Package scope @mettlelift/*, NOTICE/README/CHANGELOG, keystore env prefix, and audit tooling deferred to TASK-21.3.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Mobile and web product surfaces now present as Zor. Compatibility contract preserved: bundle IDs, IAP IDs, DB filename, S3 bucket, and OAuth-facing identifiers remain ironpulse-derived. Committed 12d2ac8.
<!-- SECTION:FINAL_SUMMARY:END -->
