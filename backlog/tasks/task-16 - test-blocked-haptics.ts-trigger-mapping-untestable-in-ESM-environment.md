---
id: TASK-16
title: 'test-blocked: haptics.ts trigger mapping untestable in ESM environment'
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-07-24 06:07'
labels:
  - bug
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/406'
priority: high
type: bug
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #406: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/406

**File:** `apps/mobile/lib/haptics.ts`

## Why
The `tryTrigger()` helper uses a dynamic `require()` call within a try/catch. Vitest runs in ESM mode where `require` is not defined. The try/catch swallows the `ReferenceError`, preventing test mocks from intercepting the trigger call. This blocks testing of enum-to-trigger-string mappings in `impactAsync()`, `notificationAsync()`, and `selectionAsync()` functions.

## Acceptance criteria
- [ ] Haptics module can be tested in ESM environment without production code changes
- [ ] `impactAsync()` trigger mappings pass unit tests with mocked react-native-haptic-feedback
- [ ] `notificationAsync()` trigger mappings pass unit tests
- [ ] `selectionAsync()` trigger mappings pass unit tests
- [ ] Vitest coverage includes all three trigger functions (≥90%)

## Out of scope
- Switching project from ESM to CommonJS
- Refactoring non-haptics test infrastructure
- Adding other missing mobile tests
<!-- SECTION:DESCRIPTION:END -->
