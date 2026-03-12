# IronPulse — Design Specification

The ultimate self-hosted fitness tracker that unifies strength training and cardio tracking in a single platform. Cloud-first with an open-core model: self-hosted is free with all features, cloud charges for hosting convenience.

## Business Model

### Open Core

- **Self-hosted**: All features, all tiers, free forever. Single `docker compose up` deployment.
- **Cloud**: Paid subscription. You're paying for convenience, sync infrastructure, and managed hosting.
- **14-day free trial** for cloud, no card required.

### Pricing Tiers (Cloud)

| Tier | Price | Annual | Target |
|------|-------|--------|--------|
| Athlete | £15/mo | £144/yr (20% off) | Individual gym-goers, runners, serious athletes |
| Coach | £30/mo | £288/yr (20% off) | Personal trainers managing up to 25 clients |

Athletes on a coach's roster receive Athlete tier included at no extra cost.

No free cloud tier. The self-hosted version is the free option.

### Revenue Projections

Fixed infrastructure costs: ~£95/mo (VPS, PowerSync, S3, domain).

| Scenario | Athletes | Coaches | Revenue/mo | Costs/mo | Profit/mo | Profit/yr |
|----------|----------|---------|------------|----------|-----------|-----------|
| Break-even | 7 | 0 | £105 | £98 | £7 | £84 |
| Early traction | 50 | 3 | £840 | £220 | £620 | £7,440 |
| Growing | 200 | 10 | £3,300 | £450 | £2,850 | £34,200 |
| Established | 500 | 25 | £8,250 | £900 | £7,350 | £88,200 |

Costs include Stripe fees (2.9% + 20p) and app store fees (15% Small Business Program rate). Assumes 60% web / 40% mobile subscriptions.

## Architecture

### Tech Stack

- **Frontend (Web)**: Next.js (App Router, SSR for landing page, SPA for dashboard)
- **Frontend (Mobile)**: React Native + Expo
- **API**: tRPC (end-to-end type safety, shared between web and mobile)
- **Database**: PostgreSQL + PostGIS (geo queries for route data)
- **ORM**: Prisma
- **Sync**: PowerSync (CRDT-based offline-first sync, SQLite on device ↔ PostgreSQL on server)
- **Object Storage**: S3 / MinIO (GPX/FIT files, profile images)
- **Cache/Queues**: Redis (sessions, background job queues)
- **Auth**: NextAuth.js (email/password, Google OAuth, Apple Sign In)
- **Payments**: Stripe (web subscriptions)
- **Monorepo**: Turborepo

### Monorepo Structure

```
ironpulse/
  ├── apps/
  │   ├── web/              # Next.js web app + API
  │   └── mobile/           # Expo React Native app
  ├── packages/
  │   ├── db/               # Prisma schema + migrations
  │   ├── api/              # tRPC routers (shared)
  │   ├── shared/           # Types, Zod schemas, constants
  │   ├── sync/             # PowerSync config + sync rules
  │   └── ui/               # Shared UI components (if any)
  ├── docker/               # Docker Compose for self-hosting
  └── docs/                 # Documentation
```

### System Components

```
┌──────────────┐    ┌──────────────┐
│  Expo App    │    │  Web App     │
│  (React      │    │  (Next.js)   │
│   Native)    │    │              │
│  SQLite      │    │  IndexedDB   │
│  PowerSync   │    │  PowerSync   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 │ tRPC + PowerSync Sync
                 ▼
       ┌─────────────────────┐
       │  API Layer          │
       │  (Next.js API +     │
       │   tRPC Routers)     │
       │                     │
       │  Auth | Workouts |  │
       │  Cardio | Analytics │
       └─────────┬───────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌────────┐
│PostgreSQL│ │PowerSync │ │Redis   │
│+ PostGIS│ │(sync     │ │(cache, │
│         │ │ engine)  │ │ queues)│
└─────────┘ └──────────┘ └────────┘
                              │
                         ┌────┘
                         ▼
                    ┌──────────┐
                    │S3 / MinIO│
                    │(files)   │
                    └──────────┘
```

External integrations (post-MVP): Garmin Connect API, Strava API, Apple HealthKit, Google Fit API.

### Offline-First Strategy

PowerSync provides CRDT-based bi-directional sync between local SQLite (on device) and PostgreSQL (on server).

- Clients generate UUIDs locally — no server round-trip needed to create records.
- All workout/cardio data is written locally first, then synced when online.
- Conflict resolution is handled automatically by PowerSync's CRDT merge.
- The app works fully offline — all data is cached locally with bi-directional sync.
- PowerSync is self-hostable, fitting the open-core model.

## Data Model

### Users & Auth

**User**: id (UUID PK), email (unique), name, avatar_url, unit_system (metric|imperial), tier (free|pro|coach), created_at.

**Account**: id (UUID PK), user_id (FK → User), provider (email|google|apple), provider_account_id, passkey_credential_id.

**Follow**: follower_id (FK → User), following_id (FK → User), created_at.

### Strength Training

**Exercise**: id (UUID PK), name, category (compound|isolation|...), primary_muscles (enum[]), secondary_muscles (enum[]), equipment (barbell|dumbbell|...), instructions, is_custom (boolean), created_by (FK → User, null for global exercises).

**Workout**: id (UUID PK), user_id (FK → User), name, started_at, completed_at, duration_seconds, notes, template_id (FK → WorkoutTemplate, optional).

**WorkoutExercise**: id (UUID PK), workout_id (FK → Workout), exercise_id (FK → Exercise), order (int), notes.

**Set**: id (UUID PK), workout_exercise_id (FK → WorkoutExercise), set_number (int), type (working|warmup|dropset|failure), weight_kg (decimal), reps (int), rpe (decimal 1-10, optional), rest_seconds (int, optional), completed (boolean).

### Cardio & Activities

**CardioSession**: id (UUID PK), user_id (FK → User), type (run|cycle|swim|hike|...), source (manual|gps|garmin|strava), started_at, duration_seconds, distance_meters (decimal), elevation_gain_m (decimal, optional), avg_heart_rate (int, optional), max_heart_rate (int, optional), calories (int, optional), route_file_url (S3 path, optional), external_id (Strava/Garmin ID, optional), notes.

**RoutePoint**: id (UUID PK), session_id (FK → CardioSession), latitude (decimal), longitude (decimal), elevation_m (decimal, optional), heart_rate (int, optional), timestamp. Stored using PostGIS for efficient geo queries and route rendering.

**Lap**: id (UUID PK), session_id (FK → CardioSession), lap_number (int), distance_meters, duration_seconds, avg_heart_rate (int, optional).

### Templates & Programs

**WorkoutTemplate**: id (UUID PK), user_id (FK → User), name, exercises (JSON — exercise + target sets/reps).

**Program** (post-MVP): id (UUID PK), coach_id (FK → User), name, description, duration_weeks (int), schedule (JSON — week → day → template).

**ProgramAssignment** (post-MVP): id (UUID PK), program_id (FK → Program), athlete_id (FK → User), coach_id (FK → User), started_at, status (active|completed|paused).

### Body Metrics

**BodyMetric**: id (UUID PK), user_id (FK → User), date, weight_kg (decimal, optional), body_fat_pct (decimal, optional), measurements (JSON — chest, waist, arms, etc., optional).

**PersonalRecord**: id (UUID PK), user_id (FK → User), exercise_id (FK → Exercise), type (1rm|3rm|5rm|volume), value (decimal), achieved_at, set_id (FK → Set).

### Social & Challenges (post-MVP)

**ActivityFeedItem**: id (UUID PK), user_id (FK → User), type (workout|cardio|pr|milestone), reference_id (UUID, polymorphic), visibility (public|followers|private), created_at.

**Challenge**: id (UUID PK), creator_id (FK → User), name, type (volume|distance|streak), target (decimal), starts_at, ends_at.

### Device Integrations (post-MVP)

**DeviceConnection**: id (UUID PK), user_id (FK → User), provider (garmin|strava|apple_health), access_token (encrypted), refresh_token (encrypted), last_synced_at, sync_enabled (boolean).

### Key Design Decisions

- All IDs are UUIDs — essential for offline-first (clients generate IDs without server).
- Weight stored in kg internally, converted to user's unit preference at display time.
- RoutePoints use PostGIS geometry types for efficient spatial queries and route rendering.
- PersonalRecord is auto-calculated from Set data but denormalised for fast lookups.
- Exercise database seeded from wger open data, users can add custom exercises for themselves.

## Authentication

- Email/password with secure hashing.
- Google OAuth (reduces friction).
- Apple Sign In (required for iOS App Store).
- Passkey/biometric support (post-MVP).
- Implemented via NextAuth.js, shared auth state between web and mobile via tRPC.

## MVP Scope

### In — MVP Launch

**Auth & Onboarding**: Email/password, Google OAuth, Apple Sign In, unit preference, 14-day free trial, Stripe subscription (web only).

**Strength Training**: Exercise database (seeded from wger), custom exercises, workout logging (exercises → sets with weight/reps/RPE), set types (working/warmup/dropset/failure), rest timer, workout templates (create/edit/start from template), workout history & detail view, personal records (auto-detected 1RM and volume PRs).

**Cardio**: Manual cardio logging (type, duration, distance), GPS live tracking (run/cycle/walk) via phone, route map display (Mapbox or Leaflet), GPX file import, pace/distance/elevation stats, cardio session history.

**Core Experience**: Dashboard (recent workouts, weekly summary, PRs), calendar view, body weight tracking + chart, basic analytics (volume over time, frequency), offline-first sync (PowerSync), profile & settings.

**Infrastructure**: Turborepo monorepo (web + mobile + shared packages), Next.js web app, Expo mobile app (iOS + Android), tRPC API, PostgreSQL + PostGIS, PowerSync, S3/MinIO, Docker Compose for self-hosting, CI/CD pipeline, landing page with pricing.

### Out — Post-MVP Phases

**Phase 2 — Integrations**: Garmin Connect sync, Strava sync, Apple HealthKit sync, Google Fit sync, FIT file import, heart rate zone tracking.

**Phase 3 — Analytics**: Advanced analytics dashboard, training load (combined cardio + strength), fatigue/recovery estimates, muscle group heatmaps, body composition (body fat %, measurements), progress photos.

**Phase 4 — Social**: Follow/followers, activity feed, challenges & leaderboards, share workouts/PRs via link.

**Phase 5 — Coaching**: Coach tier & billing, client management dashboard, program builder & assignment, progress alerts, coach ↔ athlete messaging, branded coach profiles.

**Phase 6 — Polish**: Passkey/biometric auth, push notifications, data export (CSV, JSON), App Store in-app purchases, programs (multi-week plans), workout streak tracking.

### MVP Rationale

- Strength + cardio from day one — this is the differentiator and can't launch without both.
- GPS tracking in MVP — manual-only cardio would feel like a downgrade from Strava; live tracking is needed to be credible.
- Offline-first from the start — retrofitting sync is painful; build it into the foundation.
- No integrations in MVP — GPX import covers the gap until Garmin/Strava APIs are connected.
- No social in MVP — focus on personal tracking first; social needs a user base to be valuable.
- No coaching in MVP — launch with Athlete tier only; add Coach tier when the product is proven.
- Stripe web-only for MVP — App Store billing adds complexity; launch on TestFlight initially.

## Self-Hosting

Single Docker Compose deployment with all services:

```yaml
services:
  ironpulse:        # Next.js app + API
  postgres:         # PostgreSQL + PostGIS
  powersync:        # PowerSync service (self-hosted)
  redis:            # Sessions, cache, queues
  minio:            # S3-compatible object storage
```

Users provide their own domain, TLS termination (reverse proxy), and backups. Documentation covers setup with Traefik, Nginx, and Caddy.

## Testing Strategy

- Unit tests for business logic (PR detection, analytics calculations, sync rules).
- Integration tests for tRPC routers against a real PostgreSQL database.
- E2E tests for critical user flows (sign up, log workout, log cardio session, view history).
- Mobile testing via Expo's testing tools and Detox for E2E.

## Error Handling

- Offline mutations queue locally and retry on reconnect with exponential backoff.
- Sync conflicts resolved automatically by PowerSync CRDTs.
- GPS tracking gracefully degrades if permissions denied or signal lost.
- GPX import validates file format and reports parsing errors to the user.
- Stripe webhook failures retry with idempotency keys.
