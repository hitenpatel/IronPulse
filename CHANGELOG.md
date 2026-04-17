# Changelog

## v1.0.0-rc.4 (2026-04-17) — Engagement & Quality

### Features
- Goal setting and tracking: body weight, exercise PR, weekly workouts, cardio distance with progress bars (#154)
- Notification center (web + mobile): bell with unread badge, mark read/all read, list with deep links (#143)
- Weekly summary email + push notification: opt-out in settings, cron-scheduled at /api/cron/weekly-summary (#149)
- Coach push notifications: fire on client workout completion; daily cron notifies coach on 2+ missed sessions (#163)

### Infrastructure
- Lighthouse CI job with performance/a11y budgets (LCP, CLS, score thresholds) (#159)
- axe-core Playwright tests covering login, signup, dashboard, workouts, exercises, profile, goals (#162)
- New Notification model with linkPath for deep-links
- New Goal model with decreasing-goal progress math

### Bug Fixes (post-rc.3)
- Mobile: workout exercises going off screen on Android — SafeAreaProvider now wraps the app
- Mobile: expo-notifications native module missing crashed app — gracefully degrades to no-op

### Tests
- 34 new API unit tests (goal progress, weekly summary, notifications)
- New Playwright specs: goals, a11y, notifications, weekly-summary-settings
- New Maestro tests: goals, notifications

---

## v1.0.0-rc.3 (2026-04-17) — Mobile Parity

### Features
- Mobile exercise detail screen with PR history, recent sets, muscles, media (#139)
- Mobile nutrition tracking: log meals by type, daily macro summary, delete (#140)
- Mobile sleep tracking: log sleep with quality/times/duration, 14-day history (#142)
- Mobile progress photos gallery with delete (#145)
- Mobile superset UI in active workout: link/unlink exercises with visual connector (#147)
- Mobile security settings: passkey list/rename/delete + password change (#148)
- Mobile workout templates: dedicated full-screen management view (#150)
- Mobile program view: weekly schedule with day status and start workout (#152)
- Mobile coach dashboard: stat cards, client list with status, messaging shortcut (#164)
- Mobile coaches browsing: search + specialty filter for public coach profiles (#174)
- Mobile data export: CSV/JSON via native share sheet for all data types (#175)
- Mobile CSV import: paste Strong/Hevy/FitNotes CSV with import summary (#176)
- Profile screen nav refactored into grouped sections linking all new screens

### Tests
- 6 new Maestro E2E tests covering exercise detail, nutrition, sleep, progress photos, export, security

---

## v1.0.0-rc.2 (2026-04-16)

### Features
- Replace message polling with Redis Pub/Sub SSE push — eliminates N×30 DB queries per minute (#203)
- Optimize message conversations with SQL window function (ROW_NUMBER over partition) (#204)
- Add offline/sync status indicator to web sidebar and mobile dashboard (#205)

### Improvements
- Add composite database index on `activity_feed_items(visibility, created_at)` for social feed reads (#206)
- Add `@next/bundle-analyzer` + advisory size budgets (#182)

### Infrastructure
- Add Uptime Kuma monitoring container (port 3001) + enhanced `/api/health` endpoint checking DB, Redis, and S3 with per-service latency (#155)

### Documentation
- Add project `README.md` with quick start, test accounts, project structure, and infrastructure overview (#207)

---

## v1.0.0-rc.1 (2026-04-16)

### Features
- Implement mobile push token registration via expo-notifications (#198)

### Improvements
- Replace silent `.catch(() => {})` with Sentry error capture (#201)
- Add unit tests for 11 untested API library modules (#200)
- Add runtime environment variable validation with Zod (#199)
- Upgrade NextAuth from beta.25 to beta.31 (#168)
- Add pre-commit hooks with lint-staged + husky (#146)
- Add ESLint with typescript-eslint across all packages (#144)

### Infrastructure
- Add automated backup restore verification script + systemd timer (#202)
- Staging environment confirmed on NAS (#167)
- Add structured logging with pino across API package (#158)

### Documentation
- Create deployment runbook on BookStack (#179)

### Tests
- Add 55 new API lib tests: gpx, import-parser, overload-suggestions, email, rate-limit, push, s3, feed, pr-detection, notifications (#200)
- Increase web unit test coverage — uuid, utils, passkey; fix vitest config to exclude E2E (#161)

---

## Pre-release (2026-03 — 2026-04)

### Highlights

**Pulse UI Redesign** — Complete visual overhaul across web and mobile with new design system, dark/light mode foundations, accessibility improvements, loading skeletons, empty states, and error states.

**Core Platform**
- Strength training: workouts, exercises, sets, RPE, auto-PR detection, supersets, templates
- GPS cardio: live tracking, GPX/FIT import, route maps, laps, elevation profiles
- Body metrics: weight, body fat, measurements tracking with trends
- Sleep and nutrition logging
- Social: activity feed with reactions (kudos/fire/muscle), shared workouts, user profiles
- Coaching: coach profiles, program builder, 25-client limit, direct messaging
- Challenges and achievements (badges)
- Progress photos with S3 upload
- Import/export: Strong, Hevy, FitNotes CSV; Garmin FIT files; GPX routes
- Tools: 1RM calculator, plate calculator

**Integrations**
- Device sync: Strava, Garmin Connect, Polar, Withings, Oura (OAuth + webhooks)
- Apple Health (iOS), Google Fit (Android)
- Stripe subscriptions: Athlete ($15/mo) and Coach ($30/mo) tiers
- Passkey/WebAuthn authentication alongside email/password and Google/Apple OAuth

**Infrastructure**
- Docker Compose stack: PostgreSQL 16 + PostGIS, Redis 7, MinIO, MongoDB, PowerSync
- PowerSync offline-first sync with SQLite on mobile
- CI/CD: GitHub Actions — lint, unit tests, API integration tests, Playwright E2E, Maestro iOS/Android E2E
- Automated daily PostgreSQL backups with 30-day retention
- HTTP security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on all tRPC routers
- Sentry error tracking

**Mobile**
- React Native 0.81.5 (bare CLI)
- Biometric authentication, Google/Apple OAuth
- GPS cardio tracking with react-native-maps
- Apple Health and Google Fit sync
- Onboarding wizard, settings screen

### Contributors
- Hiten Patel <hitenpatel2010@gmail.com>
