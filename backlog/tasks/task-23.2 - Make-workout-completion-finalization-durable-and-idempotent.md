---
id: TASK-23.2
title: Make workout completion finalization durable and idempotent
status: To Do
assignee: []
created_date: '2026-08-09 03:27'
updated_date: '2026-08-09 04:20'
labels:
  - api
  - database
  - sync
  - workout
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
- [ ] #1 The direct completion RPC and the first PowerSync transition to a completed workout atomically register one durable finalization record keyed by workout ID
- [ ] #2 The first completion timestamp and server-derived duration are preserved across repeated, concurrent, batch, and legacy-sync requests
- [ ] #3 Repeated, concurrent, stale-worker, and crash-recovery processing cannot duplicate PR, feed, achievement, in-app notification, or notification-outbox records
- [ ] #4 Push-provider delivery is documented and tested as at-least-once because ambiguous provider failures cannot guarantee exactly-once device delivery
- [ ] #5 Pending or stale records are retried by a deployed server-owned schedule whose owner, job ID, cadence, secret source, alert destination, and staging invocation are recorded
- [ ] #6 The finalization status API owner-scopes stable pending, processing, completed, and failed states plus finalized PR results with exercise names
- [ ] #7 A PowerSync CRUD transaction uploads through one ordered atomic mutation and finalization observes every graph change in that batch
- [ ] #8 PowerSync mobile and web modes use local completion plus status observation and never race a direct completion RPC against queued writes
- [ ] #9 Batch and legacy sync ownership checks prevent existing-ID hijacks and cross-user parent references
- [ ] #10 A fresh disposable-database migration plus API, sync, shared, web, concurrency, replay, and partial-failure tests pass
<!-- AC:END -->
