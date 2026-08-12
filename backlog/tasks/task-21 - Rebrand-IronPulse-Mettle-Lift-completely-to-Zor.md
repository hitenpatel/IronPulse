---
id: TASK-21
title: Rebrand IronPulse/Mettle Lift completely to Zor
status: Done
assignee: []
created_date: '2026-08-07 22:14'
updated_date: '2026-08-12 15:48'
labels:
  - branding
milestone: m-0
dependencies: []
references:
  - designs/zor-logo-spec.md
priority: high
type: feature
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the abandoned Mettle Lift and legacy IronPulse branding with Zor across the mobile app, web app, platform assets, documentation, package-facing labels, and deployment presentation while preserving identifiers required for existing installs, data, integrations, and hosted environments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All user-visible mobile, web, PWA, notification, permission, and documentation branding uses Zor
- [x] #2 A production SVG identity system supplies the canonical mark, small-size mark, horizontal lockup, and stacked lockup with derived native and web assets
- [x] #3 Existing mobile bundle identifiers, EAS project identity, database names, storage buckets, and legacy integration identifiers remain compatible
- [x] #4 Existing deep links, OAuth callbacks, and deployed environments continue to work through retained identifiers or explicit aliases
- [x] #5 Automated brand-string audits and relevant web/mobile tests verify the migration, with visual checks for every generated asset
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Brand decision (2026-08-08): use the established app palette as canonical for the Zor identity — lime #D4FF3A, ink #0B0D12, and warm off-white #F4F0E6. Regenerate the approved mark and all platform assets from SVG using these tokens; do not migrate the UI to the draft PNG palette.

Compatibility decision (2026-08-08): keep the Forgejo and GitHub repository paths as hiten/IronPulse. Rebrand repository titles, descriptions, README content, badges, and product-facing links to Zor without renaming remotes or breaking clone URLs.

Availability research (2026-08-08): exact display name Zor is already used on Google Play by package com.tm.zor (marketplace, 1K+ downloads, updated 2026-06-25). ZOR - The Lawyer Booking App is also live on Apple App Store and Google Play. Keep Zor as the in-product brand only if the store-facing title is differentiated and App Store Connect accepts the selected localized name.

Naming decision (2026-08-08): retain Zor as the in-product brand and installed app label. Use Zor Fitness as the Apple App Store and Google Play listing title to distinguish it from existing Zor/ZOR apps. Confirm the localized Apple name in App Store Connect before submission.

Scope decision (2026-08-08): this is a brand migration, not a UI redesign. Preserve the existing acid-sport layouts, components, navigation, interaction design, and feature behavior. Change identity assets, names, metadata, copy, safe package-facing branding, and documentation only.

Execution decision (2026-08-08): continue the Zor SVG and rebrand initiative on the existing clean design/zor-logo-system branch, which contains the approved PNG reference set. Do not create a separate worktree; preserve the dirty rename/mettle-lift checkout unchanged.

All subtasks complete. TASK-21.1: canonical Zor SVG identity system + deterministic generator + 18 platform assets + favicon.ico + Space Grotesk OFL outlined lockups. TASK-21.2: mobile + web copy, permissions, notifications, PWA manifest, transactional emails, deep-link scheme, and legal pages migrated to Zor while restoring com.ironpulse.app bundles, IAP IDs, ironpulse.db, and S3 bucket. TASK-21.3: @zor/* scope, README/NOTICE/docs, docker identifiers, keystore env prefix, code identifiers, and brand-audit + allowlist. pnpm branding:check + pnpm brand:audit both green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Zor rebrand fully landed on design/zor-logo-system. In-product brand and installed label are Zor; store listing title is documented as Zor Fitness. Bundle IDs, EAS project, DB names, S3 bucket, backup naming, OAuth callbacks, and hiten/IronPulse repository paths preserved. zor:// primary deep-link, ironpulse:// alias retained. Automated brand-string audit and Zor asset verifier gate future regressions.
<!-- SECTION:FINAL_SUMMARY:END -->
