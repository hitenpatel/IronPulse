---
id: TASK-24
title: Measure mobile workout logging efficiency
status: Done
assignee: []
created_date: '2026-08-09 03:29'
updated_date: '2026-09-07 21:04'
labels:
  - mobile
  - telemetry
  - workout
  - product
dependencies:
  - TASK-23.6
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
priority: low
type: enhancement
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After focus mode is verified, measure whether the released flow improves workout-start and set-completion efficiency without collecting exercise identity or health values. This task is informative and does not block TASK-23 release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Instrumentation records anonymous timestamps needed to calculate Start or Continue to first completed set
- [x] #2 Instrumentation records anonymous foreground interaction counts per completed set while excluding text-entry keystrokes
- [x] #3 Events contain no weights, reps, RPE, exercise identity, notes, or other health data
- [x] #4 A before-and-after report distinguishes new and returning athletes only when privacy-safe cohort data is available
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extended the existing telemetry path (packages/api/src/routers/telemetry.ts + apps/mobile/lib/telemetry.ts) rather than adding a second reporting system.

Event schema is workoutEfficiencyEventSchema, a .strict() zod object: sessionId (client-generated uuid, not the workout id), isFirstCompletedSet, interactionCount, msSinceSessionStart (only on the first completed set), isNewAthlete. .strict() makes a smuggled field a parse error, tested against weightKg, reps, rpe, exerciseName, exerciseId, notes and a generic context bag.

The WorkoutEfficiencyEvent Prisma model has no relation to User and no user-identifying column at all — verified in packages/db/prisma/schema.prisma. The mutation is authenticated only for spam control and never reads ctx.user.id.

Keystroke exclusion is structural: apps/mobile/lib/workout-interaction-counter.ts has separate recordTap and recordKeystroke entry points and only taps feed count(). TextInput.onChangeText on the weight/reps/RPE fields routes to recordWorkoutKeystroke; control presses route to recordWorkoutInteraction.

AC4's cohort split populates only when at least one row in the period carries a non-null isNewAthlete, otherwise the fields are null rather than fabricated. The flag is computed client-side from a local COUNT(*) of the account's own completed workouts — no account age, no identity signal.

Merge caveat worth remembering: the suite failed on main immediately after merging with 'Cannot read properties of undefined (reading create)' because the Prisma client in the main checkout was stale for the new model. pnpm --filter @zor/db db:generate fixed it. Any merge that adds a Prisma model needs a regenerate in the target checkout.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added anonymous workout-efficiency telemetry: a strict-schema event carrying only an opaque session id, a first-set flag, a tap count, a ms delta and an optional cohort boolean, plus a before/after report with medians for time-to-first-set and interactions-per-set. Privacy is enforced structurally — .strict() rejects extra keys, and the table has no user column to write an identifier into. Keystrokes are excluded by having no path from text input into the tap counter. Verified with pnpm --filter @zor/api test on merged main: 856 tests passing (after db:generate), and apps/mobile vitest 362 passing. Merged to main.
<!-- SECTION:FINAL_SUMMARY:END -->
