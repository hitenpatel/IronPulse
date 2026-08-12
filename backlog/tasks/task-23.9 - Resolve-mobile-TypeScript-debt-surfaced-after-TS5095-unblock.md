---
id: TASK-23.9
title: Resolve mobile TypeScript debt surfaced after TS5095 unblock
status: To Do
assignee: []
created_date: '2026-08-12 16:59'
labels:
  - mobile
  - tech-debt
  - testing
milestone: m-0
dependencies: []
parent_task_id: TASK-23
type: chore
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After TASK-23.7 changed apps/mobile/tsconfig.json module from commonjs to esnext (fixing TS5095), tsc surfaces 73 pre-existing type errors across many files. These were previously masked because tsc bailed at the config error. Resolve them to fully restore the type-check gate before shipping v1.0.0.

Baseline (2026-08-12): pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit → 73 errors.

Top categories: 6 tRPC useQuery arg-shape mismatches, 4 tabBarTestID options (unsupported in current @react-navigation/bottom-tabs), 4 PowerSync writeTransaction typing, 3 unknown navigation params, 3 missing Stack import, ~7 color-token drift, ~10 implicit anys in callbacks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit exits 0
- [ ] #2 No runtime type guards weakened to satisfy the type checker
- [ ] #3 Fixes are grouped by category with self-contained commits
<!-- AC:END -->
