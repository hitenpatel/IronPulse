---
id: TASK-10
title: 'feat(watch): scaffold WatchKit app target in Xcode project'
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-07-24 06:07'
labels:
  - agent-ready
  - feature
  - mobile
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/384'
priority: medium
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #384: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/384

Parent: #368 (Apple Watch companion app — broken into scoped sub-issues)

## Why
Apple Watch companion app is a feature parity gap vs FitNotes v3.4.0. This sub-issue covers the foundation: adding the WatchKit target to the Xcode project so subsequent watch features can be built and shipped.

## Acceptance criteria
- [ ] A WatchKit app target is added to the Xcode project at `apps/mobile/ios/` and compiles cleanly for watchOS 10.0+ on an arm64 simulator
- [ ] The watch app shows a minimal "IronPulse" placeholder screen (no data — proves the target builds and runs)
- [ ] The existing iOS build (`pnpm --filter @ironpulse/mobile ios:build`) still succeeds without errors after the new target is added
- [ ] No changes to Android build or React Native JS bundle

## Out of scope
- Any workout data display or HealthKit reads (subsequent sub-issues)
- TestFlight / App Store submission
- watchOS complications or glances
<!-- SECTION:DESCRIPTION:END -->
