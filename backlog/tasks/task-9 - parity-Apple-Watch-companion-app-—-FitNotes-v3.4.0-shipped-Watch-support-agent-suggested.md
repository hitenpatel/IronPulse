---
id: TASK-9
title: >-
  parity: Apple Watch companion app — FitNotes v3.4.0 shipped Watch support
  (agent-suggested)
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - agent-ready
  - agent-suggested
  - feature
  - mobile
  - watch
  - product
milestone: m-1
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/368'
priority: medium
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #368: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/368

## Why this surfaced
BookStack Competitive Watch (Week of 2026-04-27, page 93) notes that FitNotes iOS v3.4.0 (Apr 2026) shipped HealthKit integration + Apple Watch support. IronPulse's mobile app has HealthKit (`apps/mobile/lib/__tests__/healthkit.test.ts`) and Google Fit integration, but no watchOS/WatchKit companion app code was found in the repo.

## Observable evidence
BookStack source: "FitNotes iOS v3.4.1 (Apr 22, 2026): Crash fix on workout delete; SaveAs bug fix. Prior v3.4.0 added HealthKit integration and Apple Watch support."

Code check (2026-05-03): `grep -rn "watch|watchos|watchkit|WKExtension" apps/mobile/` returns only GPS location watcher refs and PowerSync query watchers — no watchOS companion target.

IronPulse mobile uses React Native 0.81 (bare CLI). An Apple Watch companion would require a separate WatchKit/SwiftUI target in the Xcode project.

## Acceptance criteria

- [ ] WatchKit app target is created in the Xcode project and compiles successfully for watchOS 10.0+
- [ ] Watch app displays active/recent workouts with: exercise name, reps/sets/weight, duration, calories (read from HealthKit sync data)
- [ ] User can start a workout on-watch and end it, with data synced back to iOS app (HealthKit roundtrip)
- [ ] Data sync uses existing HealthKit integration — no new auth/credential handling required
- [ ] Watch app includes: workout in-progress view (timer + current set), workout history list, quick-start buttons
- [ ] E2E test added: pair iOS+Watch simulators, start workout on phone, verify it appears on watch, mark complete on watch, verify sync back to iOS
- [ ] App Store and iOS release notes updated; watchOS app is released alongside next iOS build

**Out of scope:**
- Siri shortcuts for Watch (separate feature)
- Standalone Watch app without iPhone pairing
- Real-time form feedback or AI coaching on Watch
- Complication UI (home screen widgets)

## Suggested type
feature

## Confidence
high — no watchOS code present; competitor shipped this feature in April 2026.

---
*Filed by IronPulse Product Owner · agent-suggested · weekly Sunday sweep 2026-05-04*
<!-- SECTION:DESCRIPTION:END -->
