---
id: TASK-21.1
title: Build canonical Zor SVG identity system
status: Done
assignee: []
created_date: '2026-08-08 06:35'
updated_date: '2026-08-12 15:48'
labels:
  - branding
milestone: m-0
dependencies: []
references:
  - assets/branding/zor-logo-system.png
  - designs/zor-logo-spec.md
parent_task_id: TASK-21
priority: high
type: enhancement
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the approved raster concept with a deterministic, production-grade SVG source system using the established acid-sport palette and derive every native/web logo asset from that source.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical transparent SVGs exist for the display mark, small-size mark, horizontal lockup, and stacked lockup
- [x] #2 SVG geometry reproduces the approved Z mark and uses #D4FF3A, #0B0D12, and #F4F0E6 as applicable
- [x] #3 A deterministic generator produces iOS, Android adaptive, PWA, favicon, splash, and social assets with documented safe zones
- [x] #4 Automated checks verify SVG validity, generated dimensions, transparency, palettes, safe zones, and small-size legibility
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
0. Add exact root sharp and png-to-ico dependencies and verify a frozen pnpm install. 1. Define SVG/output contract including favicon.ico and token-specific target policy. 2. Create canonical namespace-valid SVGs and licensed outlined lockups. 3. Generate high-density platform assets with Android lime tile/ink mark and portable source/config hashes. 4. Generate density-correct 16/24 px proof and review sheet. 5. Attach proof for explicit user SVG approval before TASK-21.2.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Specification drafting started on clean design/zor-logo-system branch (2026-08-08).

Canonical SVG sources, Space Grotesk OFL-derived lockup outlines, deterministic asset generation, Android safe-zone checks, favicon output, and 16/24 px proof assets are committed. pnpm branding:generate and pnpm branding:check pass; awaiting visual approval before product cutover.

Redrew canonical Z geometry after visual review: compact connected outer silhouette with the split fully contained in the diagonal, matching the supplied reference. Regenerated all derived assets; branding checks and repeatability pass. Awaiting updated visual approval.

Root cause of repeated mismatch: prior SVGs invented a three-piece/connected construction, while the supplied standalone JPEG mark contains two interlocking lime components. Traced and simplified the two reference components from the 121x106 crop into a 64-unit SVG, updated lockups and geometry checks, regenerated all assets, and confirmed repeatable branding checks. Awaiting trace-derived visual approval.

Smoothed only the traced mark's top-left and bottom-right outer terminals with two shallow quadratic Bezier curves. Added an automated two-curve geometry assertion, regenerated all outputs, and verified repeatability and branding checks.

Removed the intermediate vertex that kinked the upper-right diagonal tip. Set the upper-right terminal and neighbor to the exact 180-degree counterpart of the lower-left terminal, added a symmetry assertion, regenerated all outputs, and verified repeatability.

Made the two Zor mark components exact 180-degree rotations of one another, including rails, taper, sharp tips, and rounded terminals. Shifted each inward by 0.5 SVG units to narrow the separation, added an exact geometry contract, regenerated all outputs, and verified repeatability.

Final Zor mark geometry approved (flat rails, aligned diagonal tips, 1.5-unit tighter pairing). Regenerated all platform assets; pnpm branding:generate and branding:check green. Committed 480af23.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered canonical Zor SVG identity system: four transparent currentColor SVGs on a 64-unit grid, deterministic sharp-based generator producing 18 mobile/web/PWA/social assets, favicon.ico, Space Grotesk OFL outlined lockups, Android safe-zone checks, 16/24 px legibility proofs, and reproducible manifest. All acceptance criteria met; branding checks pass; ready to unblock TASK-21.2.
<!-- SECTION:FINAL_SUMMARY:END -->
