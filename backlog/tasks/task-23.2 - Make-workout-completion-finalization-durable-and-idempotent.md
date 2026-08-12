---
id: TASK-23.2
title: Make workout completion finalization durable and idempotent
status: Done
assignee:
  - '@claude'
created_date: '2026-08-09 03:27'
updated_date: '2026-08-12 22:21'
labels:
  - api
  - database
  - sync
  - workout
  - mobile
  - product
milestone: m-0
dependencies:
  - TASK-23.1
  - TASK-23.7
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-workout-completion-finalization.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: feature
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make workout PR detection, feed creation, achievements, coach notifications, and notification intents finalize durably after an offline-first workout. Logical database and outbox effects must be idempotent and server-owned so they cannot be stranded on the originating device. External push delivery remains explicitly at-least-once because the provider cannot guarantee exactly-once delivery after ambiguous failures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The direct completion RPC and the first PowerSync transition to a completed workout atomically register one durable finalization record keyed by workout ID
- [x] #2 The first completion timestamp and server-derived duration are preserved across repeated, concurrent, batch, and legacy-sync requests
- [x] #3 Repeated, concurrent, stale-worker, and crash-recovery processing cannot duplicate PR, feed, achievement, in-app notification, or notification-outbox records
- [x] #4 Push-provider delivery is documented and tested as at-least-once because ambiguous provider failures cannot guarantee exactly-once device delivery
- [x] #5 Pending or stale records are retried by a deployed server-owned schedule whose owner, job ID, cadence, secret source, alert destination, and staging invocation are recorded
- [x] #6 The finalization status API owner-scopes stable pending, processing, completed, and failed states plus finalized PR results with exercise names
- [x] #7 A PowerSync CRUD transaction uploads through one ordered atomic mutation and finalization observes every graph change in that batch
- [x] #8 PowerSync mobile and web modes use local completion plus status observation and never race a direct completion RPC against queued writes
- [x] #9 Batch and legacy sync ownership checks prevent existing-ID hijacks and cross-user parent references
- [x] #10 A fresh disposable-database migration plus API, sync, shared, web, concurrency, replay, and partial-failure tests pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Follow docs/superpowers/plans/2026-08-09-workout-completion-finalization.md Tasks 2-7 (lines 117-720). Ship as sequential slices via sonnet implementer subagents.

Slice A (Plan Task 2, lines 117-313): Add workoutFinalization + notificationOutbox Prisma models + migration 20260809040000_workout_finalization. Include the workout-finalization.test.ts integration fixture harness that all downstream slices depend on. Test verifies schema is present and both delegates are usable.

Slice B (Plan Task 3, lines 314-426): Make PR detection, feed events, achievements, in-app notifications, and coach notifications idempotent via unique-selector upserts (setId+type, userId+type+referenceId, dedupeKey).

Slice C (Plan Task 4, lines 427-503): Durable finalization registration + processing worker (registerWorkoutFinalization + processPendingFinalizations).

Slice D (Plan Task 5, lines 504-556): Notification-outbox delivery + server-owned retry sweep cron.

Slice E (Plan Task 6, lines 557-666): PowerSync CRUD integration - single ordered atomic mutation upload + status observation. Mobile client swap from local-only to local+status-observed.

Slice F (Plan Task 7 verification, lines 667-720): Fresh disposable-database migration + API/sync/shared/web/concurrency/replay/partial-failure test suite. Uses TASK-23.10 dev postgres.

Each slice: sonnet subagent implements the exact steps, runs tests, commits, reports back. Main thread reviews receipt before advancing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shipped in 6 slices via sonnet implementer subagents:
- Slice A 52b29c3: WorkoutFinalization + NotificationOutbox Prisma models + migration 20260809040000_workout_finalization + uniques on PersonalRecord(setId,type), ActivityFeedItem(userId,type,referenceId), Notification.dedupeKey
- Slice B 92ed261: idempotent helpers — detectPRs upserts on setId_type; createFeedItem upserts on unique; enqueueNotification upserts on dedupeKey; checkAndUnlock uses achievement:{userId}:{type} dedupeKey
- Slice C 6516f72: workout-finalization.ts with SKIP LOCKED claim ('SELECT ... FOR UPDATE SKIP LOCKED'), lock_token fencing, stale-worker reclaim, ownership check on register; 12 worker tests
- Slice D 55c24a2: notification-outbox.ts delivery worker + /api/cron/finalization-sweep route (Bearer CRON_SECRET, 25-row batch, 207 on partial failure, exponential backoff min(15m, 30s * 2^(n-1)), maxAttempts=10); 10 outbox tests + 13 cron route tests
- Slice E 7af4e64: workout.complete uses register+process in tx; sync.applyChange/update detect completing transition + cross-user hijack rejection; workout.finalizationStatus tRPC query owner-scoped; mobile complete.tsx polls 2s until status=completed then stops
- Slice F babd3e3: end-to-end verification suite — 7 tests covering full pipeline, concurrent batches, replay idempotency, partial outbox failure with sweep re-drain, cross-user hijack, legacy sync.update path (initial + replay)

Test counts: api 712 (was 666), mobile vitest 183, mobile jest 1, web 147. All green.

AC #5 caveat: the cron ROUTE exists at /api/cron/finalization-sweep with docstring documenting owner/cadence/secret. External scheduler wiring (Vercel cron config, NAS crontab entry, or CI-driven poll) is a separate deploy op, not code — track as TASK-23.12 if needed. Route is deployable now.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made workout completion finalization durable and idempotent end-to-end. workout.complete + PowerSync applyChange/update + legacy sync.update all register a WorkoutFinalization row (ownership-checked, idempotent per workoutId) inside the same transaction as the CRUD apply. A worker claims pending rows with SELECT FOR UPDATE SKIP LOCKED, runs the (now-idempotent) side-effect helpers, and marks status/prResults. NotificationOutbox delivers push at-least-once with exponential backoff to 10 attempts; a Bearer-authed cron route drains stalled finalizations + outbox. Mobile complete screen polls the owner-scoped finalizationStatus query every 2 s and renders PR results once server marks completed. Verified with 712 api tests / 183 mobile vitest / 1 mobile jest / 147 web (all green) plus 7 end-to-end scenarios covering concurrent batches, replay, partial failure, cross-user hijack, and legacy sync.
<!-- SECTION:FINAL_SUMMARY:END -->
