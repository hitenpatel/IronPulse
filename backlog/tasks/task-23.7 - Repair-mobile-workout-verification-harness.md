---
id: TASK-23.7
title: Restore mobile unit and component test baseline
status: Done
assignee:
  - '@claude'
created_date: '2026-08-09 03:50'
updated_date: '2026-08-12 17:08'
labels:
  - mobile
  - test
  - testing
milestone: m-0
dependencies:
  - TASK-23.1
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: chore
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore a trustworthy local test foundation before focus-mode UI implementation. The current full mobile Vitest run and TypeScript command fail, and Vitest only includes pure lib tests, so required state and React Native component tests cannot yet gate changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The full mobile Vitest unit suite exits successfully with the current notification, Google Fit, and HealthKit collection failures resolved without weakening runtime guards
- [ ] #2 The documented mobile TypeScript command uses a compatible project configuration and exits successfully
- [x] #3 Mobile test scripts execute both pure library tests and React Native component tests without weakening production transforms
- [x] #4 A React Native Testing Library harness supports accessibility, keyboard, hierarchy, safe-area, and reduced-motion tests
- [x] #5 The component-test configuration has a passing focused smoke fixture and the starting failure evidence is recorded
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Follow docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md Task 1 (lines 25-91):

1. Capture failing baseline: run pnpm --filter @zor/mobile test and pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit; append exit codes + failure names to task notes.

2. Vitest repair: set apps/mobile/tsconfig.json compilerOptions.module=ESNext (keep moduleResolution=bundler). Create apps/mobile/vitest.setup.ts that mocks react-native-get-random-values as empty side-effect module. Register in vitest.config.ts.

3. notifications.test.ts: rewrite to install a deterministic global require stub before dynamic import of ../notifications, returning fakes for expo-notifications, expo-device, and react-native Platform. Reset modules/globals afterEach. Do NOT weaken the runtime module-availability guard in notifications.ts.

4. Jest for RN components: add devDeps jest@29.7.0, babel-jest@29.7.0, @types/jest@29.5.14, @testing-library/react-native, react-test-renderer@19.1.0. Create jest.config.cjs with react-native preset, babel-jest, transformIgnorePatterns allowlist (react-native, @react-native, @react-navigation, react-native-reanimated, react-native-safe-area-context, lucide-react-native, @powersync/*). Create jest.setup.ts mocking Reanimated (published mock) and safe-area insets. Add scripts test:unit, test:components, test.

5. Smoke fixture apps/mobile/components/__tests__/test-harness-smoke.test.tsx: render Pressable with role=button label='Complete set'+cb, findByRole('button', {name}), fireEvent press, assert cb called once.

6. Verify all three commands exit 0: test:unit, test:components, tsc --noEmit.

7. Commit: test(mobile): restore unit and component gates.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline (2026-08-12):
- pnpm --filter @zor/mobile test → exit 1: 3 failed / 17 passed files, 3 failed / 151 passed tests. Failures: lib/__tests__/googlefit.test.ts and lib/__tests__/healthkit.test.ts collection failure (ReferenceError: require is not defined in ES module scope — react-native-get-random-values CJS index loaded via lib/uuid.ts:5); lib/__tests__/notifications.test.ts (3 subtests): registerForPushNotifications setup does not invoke ExpoNotifications spies (module load skips the guarded runtime require).
- pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit → exit 2: TS5095 'Option bundler can only be used when module is set to preserve or to es2015 or later' (tsconfig sets module=commonjs, moduleResolution=bundler).
- No Vitest include for React Native component tests; no Jest configured; no component-harness smoke fixture.

Verified 2026-08-12:
- Vitest (Step 2 fixes): pnpm --filter @zor/mobile test → 20/20 files, 183/183 tests passing (exit 0). AC #1 met.
- Jest RN preset (Step 3): Added jest@29.7.0, babel-jest@29.7.0, @types/jest, @testing-library/react-native, react-test-renderer@19.1.0. jest.config.cjs uses react-native preset, testEnvironment=node, pnpm-aware transformIgnorePatterns matching (\.pnpm/[^/]+/node_modules/)? in front of the RN-family allowlist. jest.setup.ts installs the reanimated mock and stable safe-area insets.
- Smoke fixture (Step 4): components/__tests__/test-harness-smoke.test.tsx renders a Pressable with accessibilityRole=button + accessibilityLabel='Complete set', screen.getByRole('button', {name}) resolves, fireEvent.press invokes the callback. Awaits render() (RTL RN 14 render is async). AC #3, #4, #5 met.
- Scripts: test:unit (vitest run), test:components (jest --runInBand), test (chained).
- notifications.ts runtime guard: no weakening — still guarded by module availability. Guard now prefers globalThis.require (test injection) over the bare require identifier (Metro/CJS), which is a broader lookup, not a removal.
- AC #2 (tsc exits 0) partially met: TS5095 config error resolved by switching module=esnext. 73 pre-existing type errors previously masked by TS5095 now surface. Split into TASK-23.9 per user decision — that task will drive tsc to exit 0 before v1.0.0 ships.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the mobile test gate: Vitest unit suite is green (183/183), a Jest + @testing-library/react-native harness is configured for RN component tests with a passing smoke fixture, and TS5095 no longer blocks tsc. Notifications tests dynamically stub globalThis.require and reload the module per test; the runtime module-availability guard is preserved (broadened, not weakened). AC #2 (tsc exit 0) split into TASK-23.9 to address the 73 pre-existing type errors that were previously masked; new project config is a strict superset of what shipped so ongoing work can rely on both gates.
<!-- SECTION:FINAL_SUMMARY:END -->
