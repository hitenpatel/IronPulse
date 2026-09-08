---
id: TASK-13
title: >-
  parity: injury prevention & recovery logging — Strava added structured injury
  tracking April 2026 (agent-suggested)
status: Done
assignee:
  - '@claude'
created_date: '2026-07-24 05:58'
updated_date: '2026-09-08 02:45'
labels:
  - agent-ready
  - agent-suggested
  - feature
  - integrations
  - product
milestone: m-2
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/391'
priority: medium
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #391: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/391

## Why this surfaced

Web search for "Strava update new features May 2026" found: Strava added injury prevention and recovery features in late April 2026, providing a structured way to log, track, and share these activities. IronPulse's codebase (pack scan of `packages/api/src/routers/`) has no injury or recovery tracking router. The closest features are `body-metric`, `sleep`, and `cardio`, none of which expose an injury/recovery logging path.

## Observable evidence

From web search (https://endurance.biz/2026/industry-news/strava-targets-leaderboard-accuracy-and-rolls-out-navigation-and-club-event-updates/):
> "In late April 2026, Strava added injury prevention and recovery features, providing a structured way to log, track, and share these activities."

Router list in `packages/api/src/routers/`: achievement, analytics, auth, body-metric, cardio, challenge, coach, exercise, export, goal, import, integration, message, notification, nutrition, passkey, program, progress-photo, search, sleep, social, stripe, sync, telemetry, template, user, workout. No injury or recovery router exists.

## Acceptance criteria

- [ ] New `injury` router endpoint allows logging injury event with date, injury type (strain, fracture, soreness, etc.), severity (1–10), and affected body parts
- [ ] Injury history endpoint returns list of past injuries with filtering by body part and date range
- [ ] User can log recovery activities against injuries (physical therapy, rest day, treatment modality)
- [ ] Workout creation/modification shows past injuries and allows marking exercises as "restricted" (e.g., "no squats for 2 weeks post-injury")
- [ ] Mobile and web UI expose injury logging, history view, and recovery timeline in a new "Recovery" section

## Out of scope

- Automatic injury detection from sensor data or ML analysis
- Integration with external health services (Apple Health, Strava, Oura)
- Medical advice, diagnosis, or treatment recommendations
- Coach-to-athlete injury visibility or recovery plan assignment
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented from docs/superpowers/plans/2026-09-07-injury-recovery-logging.md, which was cross-reviewed by Codex before any code was written; that review's amendments are recorded in the plan and were binding on all three implementation slices.

Backend (plan tasks 1-3): InjuryLog, RecoveryActivity and ExerciseRestriction models with cascade delete, migration 20260907211007_injury_recovery, shared zod schemas, and an injury router with log, list, getById, update, delete, logRecovery, listRecovery, addRestriction, listRestrictions, deleteRestriction. export.allData was extended to include all three tables — it claims full GDPR Article 20 coverage, so omitting them would have made that claim false. The tables are deliberately NOT in PowerSync; the sync-rules guard tests confirm it.

Mobile (task 4): components/recovery/ presentational components with screens in app/recovery/, wired into App.tsx and the Profile link list. Logic lives in components/ because jest never scans app/, so a test placed beside the screens would silently never run. lib/date-utils.ts normalises picked dates to UTC midnight — without it a user east or west of UTC logs the wrong day against the @db.Date columns; tested with Kiritimati (UTC+14) and Midway (UTC-11).

Web (task 5) and restrictions (task 6): /recovery and /recovery/[id] pages, a shared isExerciseRestricted matcher in packages/shared, and restriction badges in both exercise pickers with an expandable panel naming the source injury — that panel is what satisfies the 'shows past injuries' half of the workout-building criterion, which the original plan had missed.

Two plan errors the implementers caught: the nav entry was specified for sidebar-nav.tsx, which is dead code never imported (app-shell.tsx renders sidebar.tsx), and prisma migrate dev could not run against the shared Postgres because untracked postgis extension dependencies read as drift — the migration was generated with migrate diff and applied with migrate deploy instead of resetting the shared database.

Muscle vocabulary is sourced from a new exercise.muscleVocabulary query returning distinct values, not from an already-fetched exercise list, because exercise pagination caps at 100 and the vocabulary must be complete. The restriction editor renders it as chips, never free text — free text was the failure mode the plan review identified as making the whole matcher unreliable.

Verified on merged main: @zor/shared 162 tests, @zor/api 878 tests, apps/web 221 tests with lint clean, apps/mobile vitest 404 and jest 101. The Playwright spec apps/web/e2e/recovery.spec.ts was run three consecutive times against a seeded DB in the implementation worktree (9/9), not re-run on main. The Maestro flow apps/mobile/e2e/recovery-log-injury.yaml is authored and selector-verified but not executed — the shared Pixel belongs to another process.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added injury and recovery logging end to end: three cascade-deleted models plus migration, an injury router (log/list/getById/update/delete, recovery activities, exercise restrictions) with export.allData extended for GDPR completeness, a mobile Recovery section, web /recovery pages, and injury-restricted exercise badges in both workout exercise pickers backed by a shared matcher. Verified on merged main with 878 API, 162 shared, 221 web, 404 mobile vitest and 101 mobile jest tests passing, plus a Playwright spec passing 3/3 in the implementation worktree. The Maestro flow is authored but unexecuted — the shared device is owned by another process.
<!-- SECTION:FINAL_SUMMARY:END -->
