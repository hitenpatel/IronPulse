---
id: TASK-23.9
title: Resolve mobile TypeScript debt surfaced after TS5095 unblock
status: Done
assignee: []
created_date: '2026-08-12 16:59'
updated_date: '2026-08-13 00:26'
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
- [x] #1 pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit exits 0
- [x] #2 No runtime type guards weakened to satisfy the type checker
- [x] #3 Fixes are grouped by category with self-contained commits
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shipped in 8 category commits (d98fa8e..d79ccba): theme literal widening, tabBarTestID→tabBarButtonTestID (bottom-tabs v7), notification payload typing at JSON boundary, WriteTransactionDb export + test cast, review-prompt mock shape, navigation typing (useNavigation<NativeStackNavigationProp<RootStackParamList>> + setOptions), Date-vs-string alignment for superjson-deserialized fields, misc component ripples. Verification: pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit exits 0; mobile 183 vitest + 1 jest, api 712, web 147 all green. Runtime guards preserved throughout — only 'as unknown as X' casts used at JSON/generic boundaries with inline comments.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
73 mobile TSC errors → 0. Landed as 8 category-grouped commits. Full type-check gate restored; mobile + api + web test suites all still green. Runtime guards preserved (no as-any weakening); casts limited to JSON boundaries and generic-parameter mock injection with inline justification.
<!-- SECTION:FINAL_SUMMARY:END -->
