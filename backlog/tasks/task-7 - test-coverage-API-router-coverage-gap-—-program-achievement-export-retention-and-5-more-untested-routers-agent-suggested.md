---
id: TASK-7
title: >-
  test-coverage: API router coverage gap — program, achievement, export,
  retention and 5 more untested routers (agent-suggested)
status: Done
assignee:
  - '@claude'
created_date: '2026-07-24 05:58'
updated_date: '2026-09-07 20:39'
labels:
  - agent-suggested
  - 'module:testing-and-quality'
  - test-coverage
  - testing
  - api
  - tech-debt
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/341'
priority: low
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #341: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/341

## Why this surfaced

Test coverage gap analysis: `packages/api/src/routers/` contains 9 routers with **no matching test file** and >50 lines each, totalling ~1,500 lines of untested business logic. All other major routers (workout, goal, cardio, auth, coach, etc.) have dedicated test files in `packages/api/__tests__/`. These routers are systematically absent.

## Observable evidence

```
405 lines  packages/api/src/routers/program.ts       — coach program CRUD + athlete assignment (coach-gated)
276 lines  packages/api/src/routers/achievement.ts   — badge unlock logic + checkAndUnlock() helper
269 lines  packages/api/src/routers/export.ts        — workout CSV/JSON export
253 lines  packages/api/src/lib/retention.ts         — re-engagement email logic
204 lines  packages/api/src/routers/challenge.ts     — challenge creation/join/progress
200 lines  packages/api/src/routers/template.ts      — workout template CRUD
161 lines  packages/api/src/routers/import.ts        — third-party import parser router
123 lines  packages/api/src/routers/nutrition.ts     — nutrition logging router
 91 lines  packages/api/src/routers/sleep.ts         — sleep data router
```

The `program.ts` and `achievement.ts` routers are especially notable — they implement premium coach features and idempotent unlock logic respectively, both without any test.

## Why
Untested routers are silent regression risks. Achievement unlock in particular is idempotent logic that's easy to break without noticing. This issue covers the three highest-value routers; remaining routers will be tracked in follow-up issues.

## Acceptance criteria
- [ ] `packages/api/__tests__/program.test.ts` covers happy-path program creation, athlete assignment, coach-gating (rejected for non-coach), and update/delete
- [ ] `packages/api/__tests__/achievement.test.ts` covers `checkAndUnlock()` idempotency (calling twice doesn't double-award), each badge-unlock condition, and the per-user badge list query
- [ ] `packages/api/__tests__/export.test.ts` covers CSV export shape, JSON export shape, and that exports respect user ownership (cannot export another user's data)
- [ ] All new tests use the existing test harness in `packages/api/__tests__/` (real PostgreSQL + Prisma) — no new mocking patterns
- [ ] Suite passes: `pnpm --filter @ironpulse/api test`

## Out of scope
- Test coverage for the remaining 6 routers (`retention.ts`, `challenge.ts`, `template.ts`, `import.ts`, `nutrition.ts`, `sleep.ts`) — separate follow-up issues
- Refactoring the routers themselves
- E2E coverage (this is unit/integration only)

## Suggested type
tech-debt

## Confidence
high — gap is observable and the test harness already exists for similar routers.

---
*Filed by IronPulse Product Owner · agent-suggested · weekly Sunday sweep*
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read existing harness (__tests__/helpers.ts, setup.ts) and a model test (goal.test.ts) for conventions.
2. Read routers program.ts, achievement.ts, export.ts to enumerate procedures and auth gates.
3. Write __tests__/program.test.ts: creation happy path, athlete assignment, non-coach rejection, update, delete.
4. Write __tests__/achievement.test.ts: checkAndUnlock idempotency, each badge condition, per-user badge list.
5. Write __tests__/export.test.ts: CSV shape, JSON shape, ownership isolation.
6. Run pnpm --filter @zor/api test; fix until green. No router refactors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified on merged main: pnpm --filter @zor/api test → Test Files 67 passed (67), Tests 823 passed (823). The three new files alone: achievement 18, export 12, program 11 = 41 tests passing. Lint: tsc --noEmit clean, eslint 7 pre-existing warnings in untouched files.

Environment fix required along the way: the shared local Postgres had drifted — migration 20260813120000_denormalize_user_id_for_powersync was recorded as applied in _prisma_migrations but the user_id columns and triggers were missing from workout_exercises, exercise_sets, laps, template_exercises and template_sets. Any workoutExercise/exerciseSet insert failed with P2022, which was already breaking pre-existing tests (workout.test.ts), not just the new ones. That migration's SQL is idempotent and was re-run against the local DB. No migration files or application code were changed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added packages/api/__tests__/{program,achievement,export}.test.ts — 41 integration tests on the existing real-Postgres harness, no new mocking patterns. program: create, athlete assignment, coach-gating on create/assign/update/delete, cross-coach ownership. achievement: checkAndUnlock idempotency, each badge condition, notification-outbox dedup, per-user list. export: CSV and JSON shape for workouts/cardio/bodyMetrics plus per-endpoint ownership isolation and allData GDPR scoping. Verified with pnpm --filter @zor/api test on merged main: 67 files, 823 tests passing. Merged to main as 9203f68. Out-of-scope routers (retention, challenge, template, import, nutrition, sleep) remain untested by design.
<!-- SECTION:FINAL_SUMMARY:END -->
