# Phase 3: Advanced Analytics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advanced analytics: training load scores, fatigue/recovery model, muscle group heatmap, body composition tracking, progress photos, and a unified analytics dashboard on web + mobile.

**Architecture:** New analytics computations in `packages/api/src/lib/training-load.ts`. New tRPC endpoints on the existing analytics router. Progress photos use S3 upload + new Prisma model. Muscle heatmap is a client-side SVG body diagram. Dashboard page aggregates all analytics.

**Tech Stack:** tRPC, Prisma, S3/MinIO, SVG (muscle map), Vitest

---

## Chunk 1: Training Load + Fatigue/Recovery (Backend)

### Task 1: Training Load Calculation (TDD)

**Files:**
- Create: `packages/api/src/lib/training-load.ts`
- Create: `packages/api/__tests__/training-load.test.ts`

Training load model:
- **Cardio load (TRIMP):** duration_minutes × avg_heart_rate_factor. Simplified: `durationSeconds / 60 * (avgHR / 180)`. If no HR data: `durationSeconds / 60 * 0.8` (default moderate).
- **Strength load:** total volume (weight × reps) normalized. `totalVolume / 1000` (arbitrary units matching cardio scale).
- **Daily load:** sum of all session loads for a day.
- **Acute load (ATL):** 7-day exponentially weighted moving average of daily load.
- **Chronic load (CTL):** 42-day EWMA of daily load.
- **Training stress balance (TSB):** CTL - ATL (positive = fresh, negative = fatigued).

Functions:
- `calculateCardioLoad(durationSeconds, avgHeartRate?)` → number
- `calculateStrengthLoad(totalVolume)` → number
- `calculateEWMA(dailyLoads: {date, load}[], days: number)` → number
- `calculateTrainingStatus(acuteLoad, chronicLoad)` → { atl, ctl, tsb, status: "fresh"|"optimal"|"fatigued"|"overreaching" }

Tests: Various scenarios for each function.

Commit: "add training load and fatigue/recovery calculations with tests"

### Task 2: Analytics Router — Training Load + Fatigue Endpoints

**Files:**
- Modify: `packages/api/src/routers/analytics.ts`

Add:
- `analytics.trainingLoad` (query) — computes daily load for last 60 days from workouts + cardio, returns `{ date, cardioLoad, strengthLoad, totalLoad }[]`
- `analytics.fitnessStatus` (query) — computes ATL, CTL, TSB, returns `{ atl, ctl, tsb, status, history: { date, atl, ctl, tsb }[] }` for chart rendering

Commit: "add training load and fitness status analytics endpoints"

### Task 3: Muscle Group Heatmap Endpoint

**Files:**
- Modify: `packages/api/src/routers/analytics.ts`

Add:
- `analytics.muscleVolume` (query) — for a date range, aggregates total volume per primary muscle group from completed sets. Returns `{ muscle: string, volume: number, percentage: number }[]`. Uses existing `weeklyVolume` logic but returns per-muscle totals instead of per-week.

Input: `{ days: number }` (default 7)

Commit: "add muscle volume analytics endpoint for heatmap"

---

## Chunk 2: Progress Photos (Model + Upload)

### Task 4: Progress Photo Prisma Model

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

Add:
```prisma
model ProgressPhoto {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  photoUrl  String   @map("photo_url")
  date      DateTime @db.Date
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@map("progress_photos")
}
```

Add `progressPhotos ProgressPhoto[]` to User model.

Commit: "add ProgressPhoto model for progress photo tracking"

### Task 5: Progress Photo tRPC Endpoints

**Files:**
- Create: `packages/api/src/routers/progress-photo.ts`
- Create: `packages/shared/src/schemas/progress-photo.ts`
- Modify: `packages/api/src/root.ts`

Endpoints:
- `progressPhoto.getUploadUrl` (mutation) — generates presigned S3 upload URL (same pattern as `user.uploadAvatar`)
- `progressPhoto.create` (mutation) — creates photo record after upload, input: `{ photoUrl, date, notes? }`
- `progressPhoto.list` (query) — paginated list ordered by date desc
- `progressPhoto.delete` (mutation) — deletes record (keeps S3 file for now)

Commit: "add progress photo tRPC endpoints with S3 upload"

---

## Chunk 3: Web Analytics Dashboard

### Task 6: Muscle Heatmap Component

**Files:**
- Create: `apps/web/src/components/analytics/muscle-heatmap.tsx`

SVG body diagram (front view, simplified). Each muscle group is a path or region that gets colored based on volume percentage:
- Low volume: muted/grey
- Medium: yellow/orange
- High: red/bright

Muscle groups: chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core, forearms

Uses `trpc.analytics.muscleVolume.useQuery({ days: 7 })` data.

Commit: "add muscle group heatmap SVG component"

### Task 7: Training Load + Fitness Charts

**Files:**
- Create: `apps/web/src/components/analytics/training-load-chart.tsx`
- Create: `apps/web/src/components/analytics/fitness-chart.tsx`

Training load chart: bar chart (SVG) showing daily load for last 30 days, with cardio and strength stacked.

Fitness chart: line chart (SVG) showing ATL, CTL, TSB over last 60 days. Three lines with different colors. TSB area shaded green (positive/fresh) or red (negative/fatigued).

Both use inline SVG like the existing weight trend chart on the stats page.

Commit: "add training load and fitness status chart components"

### Task 8: Progress Photos Section

**Files:**
- Create: `apps/web/src/components/analytics/progress-photos.tsx`

Photo grid with upload button. Uses `trpc.progressPhoto.list.useQuery()` and `trpc.progressPhoto.getUploadUrl.useMutation()`.

Upload flow: get presigned URL → upload file to S3 → create record via tRPC.

Shows photos in a date-sorted grid with dates as labels.

Commit: "add progress photos component with S3 upload"

### Task 9: Advanced Analytics Dashboard Page

**Files:**
- Modify: `apps/web/src/app/(app)/stats/page.tsx`

Upgrade the existing stats page to include:
1. Existing weight chart + log form (keep)
2. Training load chart (new)
3. Fitness status (ATL/CTL/TSB) with status badge — "Fresh", "Optimal", "Fatigued", "Overreaching"
4. Muscle heatmap (new)
5. Progress photos section (new)

Commit: "upgrade stats page with advanced analytics dashboard"

---

## Chunk 4: Mobile Analytics + Verification

### Task 10: Mobile Analytics

**Files:**
- Modify: `apps/mobile/app/(tabs)/stats.tsx`

Add to the mobile stats screen:
1. Training status badge ("Fresh"/"Optimal"/"Fatigued") from `trpc.analytics.fitnessStatus.query()` (via vanilla tRPC client)
2. Muscle volume top-3 list from `trpc.analytics.muscleVolume.query({ days: 7 })`
3. Progress photos horizontal scroll from `trpc.progressPhoto.list.query()`

Full charts are complex on mobile — show simplified summary cards instead of full SVG charts.

Commit: "add training status, muscle volume, and progress photos to mobile stats"

### Task 11: Verification

- Run: `pnpm --filter @ironpulse/api test`
- Run: `pnpm --filter @ironpulse/web build`
- Fix any issues

Commit if needed: "fix Phase 3 analytics issues"
