---
id: TASK-21.3
title: Complete safe developer and deployment branding migration to Zor
status: Done
assignee: []
created_date: '2026-08-08 06:36'
updated_date: '2026-08-08 09:04'
labels: []
dependencies:
  - TASK-21.2
parent_task_id: TASK-21
priority: high
type: chore
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove abandoned Mettle Lift developer-facing branding and remaining legacy product presentation from package metadata, documentation, self-hosting materials, repository presentation, and deployment labels while retaining compatibility-critical identifiers and remote paths.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Private workspace packages and scripts use the @zor namespace with lockfile and import references updated consistently
- [x] #2 README, NOTICE, changelog policy, self-hosting docs, repository presentation, and UI-facing deployment labels use Zor
- [x] #3 Forgejo and GitHub repository paths remain hiten/IronPulse, and compatibility-critical database, bucket, volume, bundle, EAS, OAuth, and deployed service identifiers remain unchanged
- [x] #4 Legacy names remain only in an explicit machine-readable allowlist covering compatibility or historical references
- [x] #5 Brand-string audits, monorepo tests, builds, Docker configuration validation, and documentation link checks verify the migration
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rename @mettlelift/* workspace scope to @zor/* across package.json, imports, and lockfile. 2. Restore Postgres/S3/container/backup identifiers to ironpulse-compatible values in docker/, .env.example, and CI. 3. Rewrite README, NOTICE, docker/README, Traefik, and dev script text to Zor. 4. Rename keystore env prefix METTLELIFT_* to ZOR_* and Google Fit / HealthKit mapping helpers to Zor* code identifiers. 5. Add scripts/brand-audit.mjs and scripts/brand-allowlist.json with pnpm brand:audit npm script; audit fails on Mettle Lift and unallowlisted ironpulse; historical paths excluded per spec.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
@mettlelift/* scope replaced across 161 files; pnpm-lock.yaml regenerated with pnpm install --lockfile-only. Compatibility-critical identifiers restored: com.ironpulse.app bundles, com.ironpulse.* IAP IDs, ironpulse.db PowerSync filename, ironpulse Postgres user/db/password, ironpulse MinIO bucket, ironpulse-* container names, ironpulse_ backup prefix, ironpulse:// legacy scheme, and hiten/IronPulse repository paths. brand-audit reports 745 files scanned, 0 forbidden Mettle Lift, 0 unallowlisted ironpulse. Deleted docs/claude-design-brief.md as superseded by designs/zor-logo-spec.md. Historical dirs (CHANGELOG, ADR, plans, specs, backlog, designs) skipped entirely by audit.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Zor developer and deployment branding migration complete. Committed 2389607. Package scope, package metadata, self-hosting docs, CI workflow, and dev tooling now present as Zor; every retained ironpulse identifier is explicitly documented in scripts/brand-allowlist.json with a compatibility reason. pnpm brand:audit is green; pnpm branding:check remains green.
<!-- SECTION:FINAL_SUMMARY:END -->
