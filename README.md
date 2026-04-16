# IronPulse

A self-hosted fitness tracking platform combining strength training, GPS cardio, health metrics, social features, and coaching — with offline-first sync.

## Tech Stack

- **Web**: Next.js 15, React 19, Tailwind CSS, Radix UI
- **Mobile**: React Native 0.81 (bare CLI), React Navigation
- **API**: tRPC 11, 24 feature routers
- **Database**: PostgreSQL 16 + PostGIS, Prisma 6
- **Sync**: PowerSync (offline-first with SQLite on mobile)
- **Cache**: Redis 7
- **Payments**: Stripe (Athlete/Coach tiers)
- **Auth**: NextAuth v5, passkeys (WebAuthn), Google/Apple OAuth
- **CI**: GitHub Actions (lint, unit, API integration, Playwright E2E, Maestro iOS/Android)

## Quick Start

```bash
# Prerequisites: Node 22+, pnpm 9.15+, Docker

# Clone and run the automated setup
git clone https://git.hiten-patel.co.uk/hiten/IronPulse.git
cd IronPulse
./scripts/dev-start.sh
```

The script will:
1. Generate `.env` with random secrets
2. Start PostgreSQL, Redis, MinIO via Docker Compose
3. Install dependencies and push the database schema
4. Seed test data (4 test accounts, exercise library)
5. Start the dev server at `https://ironpulse.local`

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| athlete@test.com | password123 | Athlete |
| coach@test.com | password123 | Coach |
| free@test.com | password123 | Free tier |
| new@test.com | password123 | New (no onboarding) |

## Project Structure

```
apps/
  web/          Next.js 15 web app
  mobile/       React Native 0.81 (bare CLI)

packages/
  api/          tRPC routers, integrations, utilities
  db/           Prisma schema, migrations, seeds
  shared/       Zod validators, types, constants
  sync/         PowerSync + tRPC bridge

docker/         Docker Compose, backup scripts, monitoring
scripts/        Dev setup, utilities
```

## Development

```bash
pnpm dev          # Start all apps in dev mode
pnpm lint         # TypeScript + ESLint across all packages
pnpm test         # Run all unit tests
pnpm build        # Production build

# Mobile
cd apps/mobile
pnpm android      # Run on Android emulator
pnpm ios          # Run on iOS simulator

# Database
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed production data

# Analysis
pnpm --filter @ironpulse/web analyze  # Bundle size analysis
```

## Infrastructure

Production runs as a Docker Compose stack:

- **PostgreSQL 16** (PostGIS) — primary database with logical replication
- **Redis 7** — cache, rate limiting, Pub/Sub messaging
- **MinIO** — S3-compatible object storage
- **MongoDB 7** — PowerSync state
- **PowerSync** — offline-first sync engine
- **Uptime Kuma** — monitoring (port 3001)
- **Backup** — daily automated PostgreSQL backups (30-day retention)

## Features

- Strength training with auto-PR detection, supersets, templates
- GPS cardio tracking with route maps, GPX/FIT import
- Body metrics, sleep, and nutrition tracking
- Device integrations: Strava, Garmin, Polar, Withings, Oura
- Social feed with reactions, shared workouts, challenges
- Coaching system with programs and direct messaging
- Progress photos, achievements, 1RM/plate calculators
- Offline-first on mobile with PowerSync sync

## License

Private — All rights reserved.
