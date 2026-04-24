# Changelog

## v1.0.1 (2026-04-24) — Security Patch

Out-of-band security follow-up to v1.0.0, landing all four High-severity findings from the 2026-04-24 product audit plus hardening on the expired-token cleanup cron. No user-facing behaviour changes.

### Security
- **Prevent push-token ownership takeover** (#291) — `user.registerPushToken` now refuses tokens that are already registered to a different account, closing a notification-redirect hole.
- **Verify Garmin webhook signatures** (#292) — inbound Garmin POSTs must present an `X-Garmin-Signature` header matching an HMAC-SHA256 of the raw body against `GARMIN_WEBHOOK_SECRET`. Requests without a valid signature return 401; unconfigured secrets fail closed with 503.
- **Gate feed reactions on activity visibility** (#293) — `toggleReaction` now runs the same visibility check as the feed itself, shared via a new `assertFeedItemVisible` helper. Strangers can no longer react to followers-only or private posts.

### Reliability
- **Parse Expo push API responses** (#294) — `sendPushNotification` now returns a typed `{ delivered, deadToken, error }` result. Tokens flagged as `DeviceNotRegistered` / `InvalidCredentials` are deleted from `push_tokens`; transient failures (HTTP 5xx, rate limit) leave the row in place and log via `captureError`.
- **Harden expired-token cleanup cron** (#295) — `POST /api/cron/cleanup-tokens` now runs each table's delete independently via `Promise.allSettled`, captures per-table failures to Sentry, and returns `207 Multi-Status` when partial success occurs.

### Notes
- New env var: `GARMIN_WEBHOOK_SECRET`. Set to any high-entropy string shared with Garmin's webhook configuration; rotate on a breach.

## v1.0.0 (2026-04-24) — General Availability

Consolidates seven release candidates (rc.1–rc.7) plus Sprint 16's final feature batch into the production release. IronPulse is GA.

### Sprint 16 — Launch-Prep finish
- **Warm-up generator UI wired into active workout** (#268) — chip appears once a working weight is entered; sheet lets the user pick strength/hypertrophy/light and previews the ramp before inserting; warm-ups slot in front of working sets via a single renumber transaction. User pref (scheme + enabled) in Settings.
- **Mobile Achievements screen** (#171) — grid of unlocked + locked badges with dates and progress. Shared `ACHIEVEMENT_CATALOG` extracted to `@ironpulse/shared` so web and mobile consume one source of truth.
- **Expanded achievements to 23 badge types** (#157) — added volume totals, cardio distance, social firsts, recovery streaks, goal completion, and extended workout/PR/streak milestones. New `achievement.checkMine` mutation lets screens trigger retroactive unlock on open; unlocks now emit per-badge in-app + push notifications via `notifyAchievement`.
- **Import prompt in onboarding** (#170) — optional 4th step inviting users migrating from Strong/Hevy/FitNotes to upload CSV; on confirm, lands the user directly on the import screen post-onboarding.
- **Guided first-workout tutorial** (#169) — dismissible dashboard banner (web + mobile) walks new users through start / add exercise / log sets / finish. Preference persisted on the User model so it never reappears.

### Consolidated from release candidates
- **rc.7** Polish, primitives & motion — density/type scale, 15 motion upgrades, warm-up primitive, interactive tRPC panel, ADRs, CSRF audit, CDN runbook
- **rc.6** Mobile v2 acid-sport redesign — lime primary, cobalt secondary, Instrument Sans/Space Grotesk/JetBrains Mono bundled, 40+ screens redesigned, theme-aware SVG logo v3
- **rc.5** Production readiness — critical privilege-escalation fix on `processPendingDeletions`, GDPR Article 20 export, tightened CSP, mobile release signing
- **rc.4** Engagement & quality — goals + notification centre + weekly summary + coach push + Lighthouse CI + axe-core a11y
- **rc.3** Mobile parity — 10 new mobile screens, superset UI, coach dashboard, profile nav refactor
- **rc.2** Messaging & polish — Redis Pub/Sub SSE messaging, SQL-window conversations, sync indicator, bundle analyzer, Uptime Kuma
- **rc.1** Reliability — ESLint, pino logging, env validation, push notifications, backup verification, NextAuth upgrade, 70+ new tests

### Deferred to follow-ups
- **#210 Register OAuth developer apps** and **#211 Apple Developer account** remain open as manual prerequisites for provider integrations in production.
- **#212 Pre-release regression suite** — code-level gates (unit + typecheck + lint) all green; live-infra runs (Maestro iOS/Android, Playwright, Lighthouse, Sentry triage) remain for manual sign-off.
- Hardening & enhancement backlog for v1.0.1 / v1.1.0 / v1.2.0 opened as #291–#322 from the 2026-04-24 product audit.

## v1.0.0-rc.7 (2026-04-21) — Polish, Primitives & Motion

24 commits: Launch-Prep backlog burn-down (themes, tools, warmup, panel, ADRs, CSRF, CDN, types, integrations runbook), ~15 motion/polish upgrades on mobile, four user-reported bug fixes, and a v2 theme migration across the 24 remaining secondary screens.

### Features
- **Mobile dark/light theme toggle** — system detection + secure-store persistence in Settings (#165)
- **Mobile 1RM + plate calculators** — Profile → Tools. Backed by a new `@ironpulse/shared` math layer (Epley/Brzycki/Lander 1RM, greedy plate loader for kg/lb) used by web too (#172)
- **Warm-up set generator** in `@ironpulse/shared` — strength / hypertrophy / light schemes, plate-granular rounding (#177)
- **Interactive tRPC API panel** at `/dev/api-panel` — dev-only, 180+ procedures with Zod schemas (#178)

### UI polish — density & type scale
- Tab bar bumped (icons 22→28, min height 68dp), card/row padding aligned with Material 3 + iOS HIG, typography tokens introduced (body 17, display 32, hero 44) (#262–#264, #270–#271)
- Dashboard header icons balanced, menu rows given room to breathe

### Motion & haptics
- FAB spring on press + rotating `+` → `×` transition; New Session sheet spring slide with staggered row entrances (#276)
- Dashboard cascade entrance, stat count-up (0 → value), tab icon pop + lime indicator, streak flame pulse, skeleton shimmer (#277–#278)
- Parallax Next-Up hero, rest-timer breathing glow (speeds up in final 10s), PR confetti cannon on workout complete (#280)
- Sliding lime pill under active tab (later refined to a slim underline bar), workout-history row cascade, login breathing hero (#282–#283)
- Swipe-to-delete set rows with red reveal + scaling trash icon (#281)
- Haptic feedback on FAB, tab switch, sheet row, set delete

### v2 theme migration
- 24 secondary screens migrated from the v1 navy palette onto v2 acid-sport tokens: history (workouts, workout detail, cardio, cardio detail), settings (5), auth (signup, forgot-password), social/coach (6), calendar, exercises, cardio/type-picker, route-map, month-grid, skeleton (#272 part 1 + part 2)

### Bug fixes
- **FAB dead button**: restored `NewSessionSheet` + `TemplatePicker` rendering (removed in a prior `useNavigation` refactor) (#274)
- **Dashboard Time NaN HR**: animated number now takes total minutes and reformats past 60 (#281)
- **Exercise detail "not found"**: falls back to local SQLite when the tRPC call fails (offline, auth-stale, rate-limit) (#279)
- **Login**: visible alert when fields are empty + diagnostic logging so future auth failures surface in logcat (#284)

### Documentation & infrastructure
- Integration provider setup runbook covering 10 providers — OAuth app steps, callback URLs, scopes, webhooks, env vars, test plans, rotation (BookStack 74) (#209)
- Architecture decision records for PowerSync, tRPC, offline-first, auth strategy (`docs/adr/`) (#180)
- CSRF protection audit across every public mutation surface + E2E spec for server-side rejections (BookStack 76) (#181)
- S3 `Cache-Control` profiles (immutable / longLived / shortLived) + Cloudflare CDN topology runbook (BookStack 77) (#183)

### Tech debt
- `as any` in API + auth code: **55 → 9**. NextAuth module augmentation for `Session.user` / `JWT` custom fields, typed dynamic-Prisma helper in sync router, widened `hasAlternativeAuthMethod` param (#208)

## v1.0.0-rc.6 (2026-04-20) — Mobile v2 Acid-Sport Redesign

Mobile app ground-up redesign to the "acid-sport" palette (electric lime primary, cobalt secondary, warm off-white text on near-black), plus a full SVG-sourced brand mark refresh with dark/light theme variants on web.

### Features — v2 redesign
- Redesign foundation: v2 design tokens, primitives, bottom tab bar (#213, #215, #216, #230)
- Bundled display/body/mono typefaces — Instrument Sans, Space Grotesk, JetBrains Mono (#214, #232)
- Dashboard redesign (#218, #231)
- Active workout redesign (#219, #233)
- Login redesign (#217)
- Stats redesign (#220, #239)
- Profile redesign (#221, #238)
- Exercises, templates, goals (#222, #228, #226, #241)
- Nutrition, sleep, progress photos (#223, #224, #227, #242)
- My program redesign (#229)
- v2 acid-sport palette + on-lime legibility pass (#244, #245, #246, #250)
- v2 logo mark + login hero (#247)
- App-wide v2 audit + accessibility sweep (#248)
- Connected apps v2 (#249, #255)
- Intervals.icu integration added to connected apps

### Features — brand
- Logo v3: SVG vector source of truth, theme-aware variants (cobalt-on-light / off-white-on-dark) auto-switched on web via `next-themes` class (#256)
- All PWA, Android launcher, and favicon assets regenerated from the SVG with transparent backgrounds
- Mobile `Logo` component renders via `react-native-svg` `SvgXml` at natural 487:215 aspect

### Bug Fixes
- Active-workout polish, single global active-set highlight, hook-ordering crash, left accent bar removed (#234, #235, #236, #237)
- Dark-ink-on-lime contrast fixes across A1 badge, active row, and lime surfaces (#251)
- Mobile sign-in error sanitized when database unreachable
- Connected-apps: corrected Strava/Garmin integration URLs; added Polar, Oura, Withings

### Documentation
- Design brief captured for the Claude Design redesign session (source of truth in `designs/design_handoff_new/`)

## v1.0.0-rc.5 (2026-04-18) — Production Readiness

### Security
- **Critical privilege escalation fix** — `user.processPendingDeletions` tRPC mutation was on `protectedProcedure`, letting any authenticated user trigger mass deletion of users who requested deletion 7+ days earlier. Removed entirely; moved to cron-only endpoint `/api/cron/process-deletions` with `CRON_SECRET` auth.
- Tightened CSP: drop `unsafe-eval` in production, add `strict-dynamic` so modern browsers ignore `unsafe-inline` for scripts. Added `base-uri`, `form-action`, `object-src`, `upgrade-insecure-requests` (#151)
- Rate-limit responses now include `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers so clients can back off cleanly (#194)
- Sanitized mobile sign-in error responses so raw Prisma `Can't reach database` errors no longer leak host/port details to the client

### GDPR / Compliance
- Full data portability export (`export.allData`) now includes sleep logs, meal logs, goals, notifications, messages, challenges, achievements, custom exercises, templates, follows, device connections, and coach profile — meets Article 20 requirements (#195)
- Mobile signup screen links to Terms and Privacy Policy pages during account creation (#191)

### Infrastructure
- PowerSync sync rules now cover all 11 client tables (previously missing workout_exercises, exercise_sets, laps, template_exercises, template_sets). Fixes silent sync gaps for offline-first mobile data (#196)
- Daily cron endpoints: `/api/cron/cleanup-tokens` (expired magic/reset/passkey tokens), `/api/cron/process-deletions` (GDPR 7-day deletion grace period) (#192)
- Android build memory capped to prevent OOM-killing other processes: `build-safe.sh` wrapper with `ulimit -v 8G`, `nice 10`, `ionice 2/7`; expo plugin pins `-Xmx2048m` in `gradle.properties` so `expo prebuild` regeneration keeps the safety

### Bug Fixes
- Mobile Android workout exercises no longer render off-screen — `SafeAreaProvider` now wraps the app (was missing, causing `react-native-safe-area-context` to return zero insets)
- Mobile app no longer crashes at startup when `expo-notifications` native module is missing — all calls gracefully degrade to no-ops

---

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
