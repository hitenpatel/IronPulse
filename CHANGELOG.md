# Changelog

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
