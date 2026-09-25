# Zor client database migration evidence

Date: 2026-09-25 UTC

## Local verification

- `pnpm --filter @zor/mobile test:unit -- database-readiness.test.ts powersync.test.ts`: passed; 38 files and 434 tests passed, including singleton concurrency, retry, invalid-result, progress monotonicity, and event-loop heartbeat coverage.
- `pnpm --filter @zor/mobile test:components`: passed; 12 suites and 103 tests passed, including startup ordering through database readiness and PowerSync construction.
- `pnpm identity:check -- --scope product`: passed.
- `npx expo prebuild --platform android --clean --no-install`: passed; Expo generated the Android project and discovered `zor-database-files` 1.0.0.
- `apps/mobile/scripts/build-android.sh projects`: passed under JDK 21 and the configured Android SDK; Gradle listed `:zor-database-files`.
- `apps/mobile/scripts/build-android.sh :zor-database-files:compileDebugKotlin`: passed; the Android migration module compiled successfully.
- `npx expo prebuild --platform ios --clean --no-install`: passed; Expo generated the iOS project.
- `pnpm --filter @zor/mobile exec tsc --noEmit`: remains blocked by the pre-existing missing declaration for `plugins/android-e2e-bundle.js`; no Task 4 type errors were reported.

## Release-blocking native evidence

This host is Linux/aarch64, `adb devices` reports no attached device, and Xcode/iOS Simulator is unavailable. The release candidate remains blocked until a reserved Android device and macOS/iOS runtime complete all of the following; these checks are not deferred or waived:

- Seed the old database with a unique application row and one pending `ps_crud` row, relaunch, and record `zor.db`, `PRAGMA quick_check = ok`, and preservation of both rows.
- Exercise cross-process contention and capture proof that only one promotion occurs.
- Migrate a 512 MiB seeded database while recording responsive heartbeat and monotonic copy progress through final byte equality.
- Repeat the migration, integrity, pending-row, contention, and responsiveness checks on an iOS simulator using the configured Quick SQLite directory/App Group.
- Run `EXPO_PUBLIC_E2E=1 npx expo run:android --variant debug` and `npx expo run:ios`, recording device/runtime identifiers and raw logs here.

Owner: release operator with Android device access and a reserved macOS/Xcode runner.
