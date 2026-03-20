# Changelog


## ...worktree-agent-aa9adb18


### 🚀 Enhancements

- Add server-only import guard to passkey lib (d5b1378)
- Add HTTP security headers (CSP, HSTS, X-Frame-Options) (0492e56)
- Wire up Add Note functionality on exercise card (2235831)
- Move mobile API keys to environment variables via app.config.ts (82517df)
- Apply rate limiting to all tRPC routers (e875771)
- Add production deployment pipeline and health check endpoint (d5dee3b)
- Add automated PostgreSQL backup with 30-day retention (f7a1454)
- Add privacy policy, terms of service, and signup consent (2b89e8b)
- Add Sentry error tracking to web app [IP-57] (500e146)
- Add user profile page and fix broken /social links [IP-58] (0b1d649)
- Add exercise detail page with PRs and recent sets [IP-59] (8c7c785)
- Add migration script to encrypt existing OAuth tokens [IP-63] (1875c99)
- Make activity feed items clickable with navigation [IP-62] (c7a78ba)
- Add Workouts, Templates, Feed, Messages to sidebar nav [IP-65] (db17906)
- **ci:** Add pnpm audit to lint job [IP-67] (2f20e85)
- Build athlete My Program view with schedule grid [IP-69] (c7f7a97)
- Merge SSE message streaming, remove polling fallback [IP-77] (ffd912a)
- Wire biometric auth to mobile login screen [IP-72] (a34d8e3)
- Add password change flow on security page [IP-73] (0ee0b9e)
- Add body fat percentage logging to stats UI [IP-75] (0c7d143)
- Add avatar upload on web profile page [IP-74] (ee21f12)
- Add reactions (kudos/fire/muscle) on feed items [IP-70] (00be662)
- Add workout/cardio/PR preview in feed items [IP-71] (eda2d51)
- Add Google and Apple OAuth login on mobile [IP-79] (00cb0e0)
- Add mobile onboarding flow (3-step wizard) [IP-80] (1b3db50)
- Add mobile settings screen [IP-81] (1e3bb05)
- Add 1RM calculator and plate calculator tools [IP-83] [IP-84] (a5df0f6)
- Build CSV import page for workout data [IP-82] (7a1b979)
- Replace coach profile URL paste with S3 file upload [IP-86] (b205c26)
- Add workout-level notes during active session [IP-89] (02cd692)
- Add body measurements tracking UI [IP-90] (502022f)
- Add lap splits display in cardio detail [IP-91] (6042856)
- Add email change flow with verification [IP-92] (9d1be84)
- Add template editing flow [IP-88] (a82fc61)
- Track program completion against schedule [IP-93] (4d56345)

### 🩹 Fixes

- FOR UPDATE with SELECT id instead of COUNT(*), fix test assertions (6034dd5)
- Install e2e-dashboard from GitHub repo (not npm) (8ec5a41)
- Add auth token to git remote for first-run gh-pages deploy (384ac48)
- Install e2e-dashboard in isolated dir to avoid workspace protocol conflict (411e25f)
- Remove email exposure from user search results (f309dfb)
- Enforce 25-client limit on coach addClient procedure (68d9b53)
- Add privacy check to shared workout page, require explicit sharing (b6b9cde)
- Mock server-only in vitest to fix passkey test regression (1f352be)
- Run all maestro flows as batch for complete JUnit report and screenshots (fb2c213)
- Mock rate-limit globally in API tests to prevent Redis timeout in CI (db26f37)
- **ci:** Install PostGIS on macOS, fix Maestro path in emulator script (9eacc63)
- **ci:** Symlink PostGIS extensions into PostgreSQL 16 on macOS (d9f9e24)
- **ci:** Use find to locate PostGIS files for symlink into PG16 (4508cd4)
- **ci:** Use default postgresql instead of @16 for PostGIS compat (e35c71a)
- **ci:** Auto-detect postgresql version and set PATH on macOS (cac6807)
- Generate presigned GET URLs for progress photos [IP-60] (b8a95a1)
- Fix coach upgrade link and create pricing page [IP-61] (9dece9b)
- **ci:** Gate pipeline on E2E test results [IP-64] (b9ef1d8)
- Replace placeholder text on mobile stats screen [IP-66] (09ff9dc)
- Replace window.confirm with ConfirmDialog component [IP-76] (4a942df)

### 📦 Build

- Add stacktrace to Gradle (a2688f6)
- Add node-linker=hoisted for pnpm + React Native compatibility (2af96b7)
- Exclude incompatible native modules from autolinking (ace8f78)
- Exclude expo-in-app-purchases from autolinking (00d5d56)
- Remove expo-in-app-purchases, use lazy require for IAP (1397712)
- Add expo-crypto dependency (67218ab)
- Lazy-load PowerSync and notifications to prevent crash (b3d946e)
- Exclude @simplewebauthn/server from webpack bundling (844d771)
- Dynamic import @simplewebauthn/server to avoid webpack eval error (f25dabb)
- Use webpackIgnore comment for @simplewebauthn/server dynamic import (0414cd4)

### ✅ Tests

- Add E2E tests for body fat logging and biometric login (b5fc2f3)
- Set up Playwright and add web E2E tests for Sprint 4+5 features (e4e7c0b)
- Add web E2E tests for auth flows (login, signup, onboarding) (d2e3f5f)
- Add mobile E2E tests for profile, history, feed, calendar, messages (5a05680)
- Add web E2E tests for messages, coaches, settings, user follow (be0ff2b)
- Add web E2E tests for workouts, cardio, stats, calendar (13ceca2)

### 🤖 CI

- Remove explicit pnpm version to use packageManager from package.json (ec121ba)
- Add ESLint config for Next.js, update getSession test for protectedProcedure (1e23be7)
- Fix macOS PostgreSQL setup, mark E2E as continue-on-error (945f076)
- Switch to Android emulator on Linux with PostGIS Docker service (116c330)
- Remove expo-in-app-purchases plugin (incompatible with prebuild) (8c1bc9b)
- Use absolute paths for gradlew, increase timeout to 60min (00f36cb)
- Add Gradle caching, increase timeout to 90min (a6b18c1)
- Split Android build from E2E, add Gradle/Next.js/AVD caching (4f95e1d)
- Use hoisted node-linker only for Android build job, not globally (bb63245)
- Start API server before emulator runner to avoid timeout (374c35a)
- Re-trigger CI with EXPO_TOKEN secret (9490c57)
- Add EAS project ID for iOS builds (45d9612)
- Add iOS E2E with Maestro on macOS, remove deploy job (0efb9bf)

### ❤️ Contributors

- Hiten Patel <hitenpatel2010@gmail.com>

## ...worktree-agent-aa9adb18


### 🚀 Enhancements

- Add server-only import guard to passkey lib (d5b1378)
- Add HTTP security headers (CSP, HSTS, X-Frame-Options) (0492e56)
- Wire up Add Note functionality on exercise card (2235831)
- Move mobile API keys to environment variables via app.config.ts (82517df)
- Apply rate limiting to all tRPC routers (e875771)
- Add production deployment pipeline and health check endpoint (d5dee3b)
- Add automated PostgreSQL backup with 30-day retention (f7a1454)
- Add privacy policy, terms of service, and signup consent (2b89e8b)
- Add Sentry error tracking to web app [IP-57] (500e146)
- Add user profile page and fix broken /social links [IP-58] (0b1d649)
- Add exercise detail page with PRs and recent sets [IP-59] (8c7c785)
- Add migration script to encrypt existing OAuth tokens [IP-63] (1875c99)
- Make activity feed items clickable with navigation [IP-62] (c7a78ba)
- Add Workouts, Templates, Feed, Messages to sidebar nav [IP-65] (db17906)
- **ci:** Add pnpm audit to lint job [IP-67] (2f20e85)
- Build athlete My Program view with schedule grid [IP-69] (c7f7a97)
- Merge SSE message streaming, remove polling fallback [IP-77] (ffd912a)
- Wire biometric auth to mobile login screen [IP-72] (a34d8e3)
- Add password change flow on security page [IP-73] (0ee0b9e)
- Add body fat percentage logging to stats UI [IP-75] (0c7d143)
- Add avatar upload on web profile page [IP-74] (ee21f12)
- Add reactions (kudos/fire/muscle) on feed items [IP-70] (00be662)
- Add workout/cardio/PR preview in feed items [IP-71] (eda2d51)
- Add Google and Apple OAuth login on mobile [IP-79] (00cb0e0)
- Add mobile onboarding flow (3-step wizard) [IP-80] (1b3db50)
- Add mobile settings screen [IP-81] (1e3bb05)
- Add 1RM calculator and plate calculator tools [IP-83] [IP-84] (a5df0f6)
- Build CSV import page for workout data [IP-82] (7a1b979)
- Replace coach profile URL paste with S3 file upload [IP-86] (b205c26)
- Add workout-level notes during active session [IP-89] (02cd692)
- Add body measurements tracking UI [IP-90] (502022f)
- Add lap splits display in cardio detail [IP-91] (6042856)
- Add email change flow with verification [IP-92] (9d1be84)
- Add template editing flow [IP-88] (a82fc61)
- Track program completion against schedule [IP-93] (4d56345)

### 🩹 Fixes

- FOR UPDATE with SELECT id instead of COUNT(*), fix test assertions (6034dd5)
- Install e2e-dashboard from GitHub repo (not npm) (8ec5a41)
- Add auth token to git remote for first-run gh-pages deploy (384ac48)
- Install e2e-dashboard in isolated dir to avoid workspace protocol conflict (411e25f)
- Remove email exposure from user search results (f309dfb)
- Enforce 25-client limit on coach addClient procedure (68d9b53)
- Add privacy check to shared workout page, require explicit sharing (b6b9cde)
- Mock server-only in vitest to fix passkey test regression (1f352be)
- Run all maestro flows as batch for complete JUnit report and screenshots (fb2c213)
- Mock rate-limit globally in API tests to prevent Redis timeout in CI (db26f37)
- **ci:** Install PostGIS on macOS, fix Maestro path in emulator script (9eacc63)
- **ci:** Symlink PostGIS extensions into PostgreSQL 16 on macOS (d9f9e24)
- **ci:** Use find to locate PostGIS files for symlink into PG16 (4508cd4)
- **ci:** Use default postgresql instead of @16 for PostGIS compat (e35c71a)
- **ci:** Auto-detect postgresql version and set PATH on macOS (cac6807)
- Generate presigned GET URLs for progress photos [IP-60] (b8a95a1)
- Fix coach upgrade link and create pricing page [IP-61] (9dece9b)
- **ci:** Gate pipeline on E2E test results [IP-64] (b9ef1d8)
- Replace placeholder text on mobile stats screen [IP-66] (09ff9dc)
- Replace window.confirm with ConfirmDialog component [IP-76] (4a942df)

### 📦 Build

- Add stacktrace to Gradle (a2688f6)
- Add node-linker=hoisted for pnpm + React Native compatibility (2af96b7)
- Exclude incompatible native modules from autolinking (ace8f78)
- Exclude expo-in-app-purchases from autolinking (00d5d56)
- Remove expo-in-app-purchases, use lazy require for IAP (1397712)
- Add expo-crypto dependency (67218ab)
- Lazy-load PowerSync and notifications to prevent crash (b3d946e)
- Exclude @simplewebauthn/server from webpack bundling (844d771)
- Dynamic import @simplewebauthn/server to avoid webpack eval error (f25dabb)
- Use webpackIgnore comment for @simplewebauthn/server dynamic import (0414cd4)

### ✅ Tests

- Add E2E tests for body fat logging and biometric login (b5fc2f3)
- Set up Playwright and add web E2E tests for Sprint 4+5 features (e4e7c0b)
- Add web E2E tests for auth flows (login, signup, onboarding) (d2e3f5f)
- Add mobile E2E tests for profile, history, feed, calendar, messages (5a05680)
- Add web E2E tests for messages, coaches, settings, user follow (be0ff2b)
- Add web E2E tests for workouts, cardio, stats, calendar (13ceca2)

### 🤖 CI

- Remove explicit pnpm version to use packageManager from package.json (ec121ba)
- Add ESLint config for Next.js, update getSession test for protectedProcedure (1e23be7)
- Fix macOS PostgreSQL setup, mark E2E as continue-on-error (945f076)
- Switch to Android emulator on Linux with PostGIS Docker service (116c330)
- Remove expo-in-app-purchases plugin (incompatible with prebuild) (8c1bc9b)
- Use absolute paths for gradlew, increase timeout to 60min (00f36cb)
- Add Gradle caching, increase timeout to 90min (a6b18c1)
- Split Android build from E2E, add Gradle/Next.js/AVD caching (4f95e1d)
- Use hoisted node-linker only for Android build job, not globally (bb63245)
- Start API server before emulator runner to avoid timeout (374c35a)
- Re-trigger CI with EXPO_TOKEN secret (9490c57)
- Add EAS project ID for iOS builds (45d9612)
- Add iOS E2E with Maestro on macOS, remove deploy job (0efb9bf)

### ❤️ Contributors

- Hiten Patel <hitenpatel2010@gmail.com>

## ...worktree-agent-aa9adb18


### 🚀 Enhancements

- Add server-only import guard to passkey lib (d5b1378)
- Add HTTP security headers (CSP, HSTS, X-Frame-Options) (0492e56)
- Wire up Add Note functionality on exercise card (2235831)
- Move mobile API keys to environment variables via app.config.ts (82517df)
- Apply rate limiting to all tRPC routers (e875771)
- Add production deployment pipeline and health check endpoint (d5dee3b)
- Add automated PostgreSQL backup with 30-day retention (f7a1454)
- Add privacy policy, terms of service, and signup consent (2b89e8b)
- Add Sentry error tracking to web app [IP-57] (500e146)
- Add user profile page and fix broken /social links [IP-58] (0b1d649)
- Add exercise detail page with PRs and recent sets [IP-59] (8c7c785)
- Add migration script to encrypt existing OAuth tokens [IP-63] (1875c99)
- Make activity feed items clickable with navigation [IP-62] (c7a78ba)
- Add Workouts, Templates, Feed, Messages to sidebar nav [IP-65] (db17906)
- **ci:** Add pnpm audit to lint job [IP-67] (2f20e85)
- Build athlete My Program view with schedule grid [IP-69] (c7f7a97)
- Merge SSE message streaming, remove polling fallback [IP-77] (ffd912a)
- Wire biometric auth to mobile login screen [IP-72] (a34d8e3)
- Add password change flow on security page [IP-73] (0ee0b9e)
- Add body fat percentage logging to stats UI [IP-75] (0c7d143)
- Add avatar upload on web profile page [IP-74] (ee21f12)
- Add reactions (kudos/fire/muscle) on feed items [IP-70] (00be662)
- Add workout/cardio/PR preview in feed items [IP-71] (eda2d51)
- Add Google and Apple OAuth login on mobile [IP-79] (00cb0e0)
- Add mobile onboarding flow (3-step wizard) [IP-80] (1b3db50)
- Add mobile settings screen [IP-81] (1e3bb05)
- Add 1RM calculator and plate calculator tools [IP-83] [IP-84] (a5df0f6)
- Build CSV import page for workout data [IP-82] (7a1b979)
- Replace coach profile URL paste with S3 file upload [IP-86] (b205c26)
- Add workout-level notes during active session [IP-89] (02cd692)
- Add body measurements tracking UI [IP-90] (502022f)
- Add lap splits display in cardio detail [IP-91] (6042856)
- Add email change flow with verification [IP-92] (9d1be84)
- Add template editing flow [IP-88] (a82fc61)
- Track program completion against schedule [IP-93] (4d56345)

### 🩹 Fixes

- FOR UPDATE with SELECT id instead of COUNT(*), fix test assertions (6034dd5)
- Install e2e-dashboard from GitHub repo (not npm) (8ec5a41)
- Add auth token to git remote for first-run gh-pages deploy (384ac48)
- Install e2e-dashboard in isolated dir to avoid workspace protocol conflict (411e25f)
- Remove email exposure from user search results (f309dfb)
- Enforce 25-client limit on coach addClient procedure (68d9b53)
- Add privacy check to shared workout page, require explicit sharing (b6b9cde)
- Mock server-only in vitest to fix passkey test regression (1f352be)
- Run all maestro flows as batch for complete JUnit report and screenshots (fb2c213)
- Mock rate-limit globally in API tests to prevent Redis timeout in CI (db26f37)
- **ci:** Install PostGIS on macOS, fix Maestro path in emulator script (9eacc63)
- **ci:** Symlink PostGIS extensions into PostgreSQL 16 on macOS (d9f9e24)
- **ci:** Use find to locate PostGIS files for symlink into PG16 (4508cd4)
- **ci:** Use default postgresql instead of @16 for PostGIS compat (e35c71a)
- **ci:** Auto-detect postgresql version and set PATH on macOS (cac6807)
- Generate presigned GET URLs for progress photos [IP-60] (b8a95a1)
- Fix coach upgrade link and create pricing page [IP-61] (9dece9b)
- **ci:** Gate pipeline on E2E test results [IP-64] (b9ef1d8)
- Replace placeholder text on mobile stats screen [IP-66] (09ff9dc)
- Replace window.confirm with ConfirmDialog component [IP-76] (4a942df)

### 📦 Build

- Add stacktrace to Gradle (a2688f6)
- Add node-linker=hoisted for pnpm + React Native compatibility (2af96b7)
- Exclude incompatible native modules from autolinking (ace8f78)
- Exclude expo-in-app-purchases from autolinking (00d5d56)
- Remove expo-in-app-purchases, use lazy require for IAP (1397712)
- Add expo-crypto dependency (67218ab)
- Lazy-load PowerSync and notifications to prevent crash (b3d946e)
- Exclude @simplewebauthn/server from webpack bundling (844d771)
- Dynamic import @simplewebauthn/server to avoid webpack eval error (f25dabb)
- Use webpackIgnore comment for @simplewebauthn/server dynamic import (0414cd4)

### ✅ Tests

- Add E2E tests for body fat logging and biometric login (b5fc2f3)
- Set up Playwright and add web E2E tests for Sprint 4+5 features (e4e7c0b)
- Add web E2E tests for auth flows (login, signup, onboarding) (d2e3f5f)
- Add mobile E2E tests for profile, history, feed, calendar, messages (5a05680)
- Add web E2E tests for messages, coaches, settings, user follow (be0ff2b)
- Add web E2E tests for workouts, cardio, stats, calendar (13ceca2)

### 🤖 CI

- Remove explicit pnpm version to use packageManager from package.json (ec121ba)
- Add ESLint config for Next.js, update getSession test for protectedProcedure (1e23be7)
- Fix macOS PostgreSQL setup, mark E2E as continue-on-error (945f076)
- Switch to Android emulator on Linux with PostGIS Docker service (116c330)
- Remove expo-in-app-purchases plugin (incompatible with prebuild) (8c1bc9b)
- Use absolute paths for gradlew, increase timeout to 60min (00f36cb)
- Add Gradle caching, increase timeout to 90min (a6b18c1)
- Split Android build from E2E, add Gradle/Next.js/AVD caching (4f95e1d)
- Use hoisted node-linker only for Android build job, not globally (bb63245)
- Start API server before emulator runner to avoid timeout (374c35a)
- Re-trigger CI with EXPO_TOKEN secret (9490c57)
- Add EAS project ID for iOS builds (45d9612)
- Add iOS E2E with Maestro on macOS, remove deploy job (0efb9bf)

### ❤️ Contributors

- Hiten Patel <hitenpatel2010@gmail.com>

## ...worktree-agent-aa9adb18


### 🚀 Enhancements

- Add server-only import guard to passkey lib (d5b1378)
- Add HTTP security headers (CSP, HSTS, X-Frame-Options) (0492e56)
- Wire up Add Note functionality on exercise card (2235831)
- Move mobile API keys to environment variables via app.config.ts (82517df)
- Apply rate limiting to all tRPC routers (e875771)
- Add production deployment pipeline and health check endpoint (d5dee3b)
- Add automated PostgreSQL backup with 30-day retention (f7a1454)
- Add privacy policy, terms of service, and signup consent (2b89e8b)
- Add Sentry error tracking to web app [IP-57] (500e146)
- Add user profile page and fix broken /social links [IP-58] (0b1d649)
- Add exercise detail page with PRs and recent sets [IP-59] (8c7c785)
- Add migration script to encrypt existing OAuth tokens [IP-63] (1875c99)
- Make activity feed items clickable with navigation [IP-62] (c7a78ba)
- Add Workouts, Templates, Feed, Messages to sidebar nav [IP-65] (db17906)
- **ci:** Add pnpm audit to lint job [IP-67] (2f20e85)
- Build athlete My Program view with schedule grid [IP-69] (c7f7a97)
- Merge SSE message streaming, remove polling fallback [IP-77] (ffd912a)
- Wire biometric auth to mobile login screen [IP-72] (a34d8e3)
- Add password change flow on security page [IP-73] (0ee0b9e)
- Add body fat percentage logging to stats UI [IP-75] (0c7d143)
- Add avatar upload on web profile page [IP-74] (ee21f12)
- Add reactions (kudos/fire/muscle) on feed items [IP-70] (00be662)
- Add workout/cardio/PR preview in feed items [IP-71] (eda2d51)
- Add Google and Apple OAuth login on mobile [IP-79] (00cb0e0)
- Add mobile onboarding flow (3-step wizard) [IP-80] (1b3db50)
- Add mobile settings screen [IP-81] (1e3bb05)
- Add 1RM calculator and plate calculator tools [IP-83] [IP-84] (a5df0f6)
- Build CSV import page for workout data [IP-82] (7a1b979)
- Replace coach profile URL paste with S3 file upload [IP-86] (b205c26)
- Add workout-level notes during active session [IP-89] (02cd692)
- Add body measurements tracking UI [IP-90] (502022f)
- Add lap splits display in cardio detail [IP-91] (6042856)
- Add email change flow with verification [IP-92] (9d1be84)
- Add template editing flow [IP-88] (a82fc61)
- Track program completion against schedule [IP-93] (4d56345)

### 🩹 Fixes

- FOR UPDATE with SELECT id instead of COUNT(*), fix test assertions (6034dd5)
- Install e2e-dashboard from GitHub repo (not npm) (8ec5a41)
- Add auth token to git remote for first-run gh-pages deploy (384ac48)
- Install e2e-dashboard in isolated dir to avoid workspace protocol conflict (411e25f)
- Remove email exposure from user search results (f309dfb)
- Enforce 25-client limit on coach addClient procedure (68d9b53)
- Add privacy check to shared workout page, require explicit sharing (b6b9cde)
- Mock server-only in vitest to fix passkey test regression (1f352be)
- Run all maestro flows as batch for complete JUnit report and screenshots (fb2c213)
- Mock rate-limit globally in API tests to prevent Redis timeout in CI (db26f37)
- **ci:** Install PostGIS on macOS, fix Maestro path in emulator script (9eacc63)
- **ci:** Symlink PostGIS extensions into PostgreSQL 16 on macOS (d9f9e24)
- **ci:** Use find to locate PostGIS files for symlink into PG16 (4508cd4)
- **ci:** Use default postgresql instead of @16 for PostGIS compat (e35c71a)
- **ci:** Auto-detect postgresql version and set PATH on macOS (cac6807)
- Generate presigned GET URLs for progress photos [IP-60] (b8a95a1)
- Fix coach upgrade link and create pricing page [IP-61] (9dece9b)
- **ci:** Gate pipeline on E2E test results [IP-64] (b9ef1d8)
- Replace placeholder text on mobile stats screen [IP-66] (09ff9dc)
- Replace window.confirm with ConfirmDialog component [IP-76] (4a942df)

### 📦 Build

- Add stacktrace to Gradle (a2688f6)
- Add node-linker=hoisted for pnpm + React Native compatibility (2af96b7)
- Exclude incompatible native modules from autolinking (ace8f78)
- Exclude expo-in-app-purchases from autolinking (00d5d56)
- Remove expo-in-app-purchases, use lazy require for IAP (1397712)
- Add expo-crypto dependency (67218ab)
- Lazy-load PowerSync and notifications to prevent crash (b3d946e)
- Exclude @simplewebauthn/server from webpack bundling (844d771)
- Dynamic import @simplewebauthn/server to avoid webpack eval error (f25dabb)
- Use webpackIgnore comment for @simplewebauthn/server dynamic import (0414cd4)

### ✅ Tests

- Add E2E tests for body fat logging and biometric login (b5fc2f3)
- Set up Playwright and add web E2E tests for Sprint 4+5 features (e4e7c0b)
- Add web E2E tests for auth flows (login, signup, onboarding) (d2e3f5f)
- Add mobile E2E tests for profile, history, feed, calendar, messages (5a05680)
- Add web E2E tests for messages, coaches, settings, user follow (be0ff2b)
- Add web E2E tests for workouts, cardio, stats, calendar (13ceca2)

### 🤖 CI

- Remove explicit pnpm version to use packageManager from package.json (ec121ba)
- Add ESLint config for Next.js, update getSession test for protectedProcedure (1e23be7)
- Fix macOS PostgreSQL setup, mark E2E as continue-on-error (945f076)
- Switch to Android emulator on Linux with PostGIS Docker service (116c330)
- Remove expo-in-app-purchases plugin (incompatible with prebuild) (8c1bc9b)
- Use absolute paths for gradlew, increase timeout to 60min (00f36cb)
- Add Gradle caching, increase timeout to 90min (a6b18c1)
- Split Android build from E2E, add Gradle/Next.js/AVD caching (4f95e1d)
- Use hoisted node-linker only for Android build job, not globally (bb63245)
- Start API server before emulator runner to avoid timeout (374c35a)
- Re-trigger CI with EXPO_TOKEN secret (9490c57)
- Add EAS project ID for iOS builds (45d9612)
- Add iOS E2E with Maestro on macOS, remove deploy job (0efb9bf)

### ❤️ Contributors

- Hiten Patel <hitenpatel2010@gmail.com>

## ...worktree-agent-aa9adb18


### 🚀 Enhancements

- Add server-only import guard to passkey lib (d5b1378)
- Add HTTP security headers (CSP, HSTS, X-Frame-Options) (0492e56)
- Wire up Add Note functionality on exercise card (2235831)
- Move mobile API keys to environment variables via app.config.ts (82517df)
- Apply rate limiting to all tRPC routers (e875771)
- Add production deployment pipeline and health check endpoint (d5dee3b)
- Add automated PostgreSQL backup with 30-day retention (f7a1454)
- Add privacy policy, terms of service, and signup consent (2b89e8b)
- Add Sentry error tracking to web app [IP-57] (500e146)
- Add user profile page and fix broken /social links [IP-58] (0b1d649)
- Add exercise detail page with PRs and recent sets [IP-59] (8c7c785)
- Add migration script to encrypt existing OAuth tokens [IP-63] (1875c99)
- Make activity feed items clickable with navigation [IP-62] (c7a78ba)
- Add Workouts, Templates, Feed, Messages to sidebar nav [IP-65] (db17906)
- **ci:** Add pnpm audit to lint job [IP-67] (2f20e85)
- Build athlete My Program view with schedule grid [IP-69] (c7f7a97)
- Merge SSE message streaming, remove polling fallback [IP-77] (ffd912a)
- Wire biometric auth to mobile login screen [IP-72] (a34d8e3)
- Add password change flow on security page [IP-73] (0ee0b9e)
- Add body fat percentage logging to stats UI [IP-75] (0c7d143)
- Add avatar upload on web profile page [IP-74] (ee21f12)
- Add reactions (kudos/fire/muscle) on feed items [IP-70] (00be662)
- Add workout/cardio/PR preview in feed items [IP-71] (eda2d51)
- Add Google and Apple OAuth login on mobile [IP-79] (00cb0e0)
- Add mobile onboarding flow (3-step wizard) [IP-80] (1b3db50)
- Add mobile settings screen [IP-81] (1e3bb05)
- Add 1RM calculator and plate calculator tools [IP-83] [IP-84] (a5df0f6)
- Build CSV import page for workout data [IP-82] (7a1b979)
- Replace coach profile URL paste with S3 file upload [IP-86] (b205c26)
- Add workout-level notes during active session [IP-89] (02cd692)
- Add body measurements tracking UI [IP-90] (502022f)
- Add lap splits display in cardio detail [IP-91] (6042856)
- Add email change flow with verification [IP-92] (9d1be84)
- Add template editing flow [IP-88] (a82fc61)
- Track program completion against schedule [IP-93] (4d56345)

### 🩹 Fixes

- FOR UPDATE with SELECT id instead of COUNT(*), fix test assertions (6034dd5)
- Install e2e-dashboard from GitHub repo (not npm) (8ec5a41)
- Add auth token to git remote for first-run gh-pages deploy (384ac48)
- Install e2e-dashboard in isolated dir to avoid workspace protocol conflict (411e25f)
- Remove email exposure from user search results (f309dfb)
- Enforce 25-client limit on coach addClient procedure (68d9b53)
- Add privacy check to shared workout page, require explicit sharing (b6b9cde)
- Mock server-only in vitest to fix passkey test regression (1f352be)
- Run all maestro flows as batch for complete JUnit report and screenshots (fb2c213)
- Mock rate-limit globally in API tests to prevent Redis timeout in CI (db26f37)
- **ci:** Install PostGIS on macOS, fix Maestro path in emulator script (9eacc63)
- **ci:** Symlink PostGIS extensions into PostgreSQL 16 on macOS (d9f9e24)
- **ci:** Use find to locate PostGIS files for symlink into PG16 (4508cd4)
- **ci:** Use default postgresql instead of @16 for PostGIS compat (e35c71a)
- **ci:** Auto-detect postgresql version and set PATH on macOS (cac6807)
- Generate presigned GET URLs for progress photos [IP-60] (b8a95a1)
- Fix coach upgrade link and create pricing page [IP-61] (9dece9b)
- **ci:** Gate pipeline on E2E test results [IP-64] (b9ef1d8)
- Replace placeholder text on mobile stats screen [IP-66] (09ff9dc)
- Replace window.confirm with ConfirmDialog component [IP-76] (4a942df)

### 📦 Build

- Add stacktrace to Gradle (a2688f6)
- Add node-linker=hoisted for pnpm + React Native compatibility (2af96b7)
- Exclude incompatible native modules from autolinking (ace8f78)
- Exclude expo-in-app-purchases from autolinking (00d5d56)
- Remove expo-in-app-purchases, use lazy require for IAP (1397712)
- Add expo-crypto dependency (67218ab)
- Lazy-load PowerSync and notifications to prevent crash (b3d946e)
- Exclude @simplewebauthn/server from webpack bundling (844d771)
- Dynamic import @simplewebauthn/server to avoid webpack eval error (f25dabb)
- Use webpackIgnore comment for @simplewebauthn/server dynamic import (0414cd4)

### ✅ Tests

- Add E2E tests for body fat logging and biometric login (b5fc2f3)
- Set up Playwright and add web E2E tests for Sprint 4+5 features (e4e7c0b)
- Add web E2E tests for auth flows (login, signup, onboarding) (d2e3f5f)
- Add mobile E2E tests for profile, history, feed, calendar, messages (5a05680)
- Add web E2E tests for messages, coaches, settings, user follow (be0ff2b)
- Add web E2E tests for workouts, cardio, stats, calendar (13ceca2)

### 🤖 CI

- Remove explicit pnpm version to use packageManager from package.json (ec121ba)
- Add ESLint config for Next.js, update getSession test for protectedProcedure (1e23be7)
- Fix macOS PostgreSQL setup, mark E2E as continue-on-error (945f076)
- Switch to Android emulator on Linux with PostGIS Docker service (116c330)
- Remove expo-in-app-purchases plugin (incompatible with prebuild) (8c1bc9b)
- Use absolute paths for gradlew, increase timeout to 60min (00f36cb)
- Add Gradle caching, increase timeout to 90min (a6b18c1)
- Split Android build from E2E, add Gradle/Next.js/AVD caching (4f95e1d)
- Use hoisted node-linker only for Android build job, not globally (bb63245)
- Start API server before emulator runner to avoid timeout (374c35a)
- Re-trigger CI with EXPO_TOKEN secret (9490c57)
- Add EAS project ID for iOS builds (45d9612)
- Add iOS E2E with Maestro on macOS, remove deploy job (0efb9bf)

### ❤️ Contributors

- Hiten Patel <hitenpatel2010@gmail.com>

