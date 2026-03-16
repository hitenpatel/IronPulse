# Phase 6: Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Final polish: push notifications, data export (CSV/JSON), workout streak tracking, and App Store IAP preparation. Passkeys deferred (complex, low urgency).

**Architecture:** Push notifications via `expo-notifications` + server-side send via web-push. Data export as server-generated CSV/JSON downloads. Workout streaks computed from workout/cardio history. IAP via `expo-in-app-purchases` with receipt validation.

**Tech Stack:** `expo-notifications`, `web-push`, `csv-stringify`, `expo-in-app-purchases`, tRPC, Prisma

---

## Chunk 1: Push Notifications

### Task 1: Push Token Storage + Server Send

Add to Prisma schema:
```prisma
model PushToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  platform  String   // ios|android|web
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("push_tokens")
}
```

Add `pushTokens PushToken[]` to User. Run prisma generate.

Create `packages/api/src/lib/push.ts`:
- `sendPushNotification(token, title, body, data?)` — sends via Expo Push API (`https://exp.host/--/api/v2/push/send`)

Create tRPC endpoints:
- `user.registerPushToken` (mutation) — store token + platform
- `user.unregisterPushToken` (mutation) — delete token

Commit: "add push notification token storage and server send utility"

### Task 2: Notification Triggers

Add push notifications for key events:
- **PR detected** — in workout.complete, after PR detection, send push to the user: "New PR! {exercise} — {value}"
- **Coach message** — in message.send, send push to receiver: "New message from {sender}"
- **Challenge milestone** — when progress passes 50%/100% of target

Create `packages/api/src/lib/notifications.ts` with helpers:
- `notifyNewPR(db, userId, exerciseName, value)`
- `notifyNewMessage(db, receiverId, senderName)`
- `notifyChallengeProgress(db, userId, challengeName, percentage)`

Each helper looks up push tokens and calls `sendPushNotification`.

Commit: "add push notification triggers for PRs, messages, and challenges"

### Task 3: Mobile Push Registration

Install: `pnpm --filter @ironpulse/mobile add expo-notifications expo-device`

In `apps/mobile/app/_layout.tsx`, after auth + PowerSync connect:
- Request notification permissions
- Get Expo push token
- Register via `trpc.user.registerPushToken.mutate({ token, platform })`

Handle incoming notifications: display as in-app banner or navigate to relevant screen.

Commit: "register push tokens and handle notifications on mobile"

---

## Chunk 2: Data Export

### Task 4: Export Endpoints

Create `packages/api/src/routers/export.ts`:
- `export.workoutsCSV` (mutation) — generates CSV of all workouts with exercises/sets
- `export.workoutsJSON` (mutation) — generates JSON export
- `export.cardioCSV` (mutation) — CSV of all cardio sessions
- `export.bodyMetricsCSV` (mutation) — CSV of body metrics
- `export.allData` (mutation) — complete JSON export (workouts + cardio + metrics + PRs)

Each returns the generated content as a string. The web client triggers a download; mobile saves to device.

Install: `pnpm --filter @ironpulse/api add csv-stringify`

Register in root: `export: exportRouter`

Commit: "add data export tRPC endpoints for CSV and JSON"

### Task 5: Export UI

Web: Add "Export Data" section to profile/settings page with buttons for each export type. On click, call mutation → create Blob → trigger download.

Mobile: Add "Export Data" section to profile screen. On click, call mutation → save to Files app via `expo-sharing`.

Commit: "add data export UI on web and mobile"

---

## Chunk 3: Workout Streaks

### Task 6: Streak Calculation (TDD)

Create `packages/shared/src/streaks.ts`:

```typescript
export function calculateStreak(activityDates: string[]): { current: number; longest: number } {
  // activityDates = sorted array of YYYY-MM-DD strings
  // A streak = consecutive days with at least one activity
  // Returns current streak (ending today or yesterday) and longest ever
}
```

Tests at `packages/shared/src/__tests__/streaks.test.ts`:
- Empty dates → { current: 0, longest: 0 }
- Single date today → { current: 1, longest: 1 }
- 3 consecutive days ending today → { current: 3, longest: 3 }
- Gap breaks streak → current resets
- Longest tracks all-time best

Export from shared index.

Commit: "add workout streak calculation with tests"

### Task 7: Streak Display

Add `analytics.streak` tRPC endpoint:
- Query all workout and cardio `started_at` dates
- Extract unique YYYY-MM-DD dates
- Calculate streak via shared function
- Return `{ current, longest }`

Web: Add streak badge to dashboard (fire emoji + "5 day streak").
Mobile: Add streak badge to dashboard.

Commit: "add streak display on web and mobile dashboards"

---

## Chunk 4: App Store IAP Preparation

### Task 8: IAP Setup

Install: `pnpm --filter @ironpulse/mobile add expo-in-app-purchases`

Create `apps/mobile/lib/iap.ts`:
- Configure product IDs matching App Store Connect products
- `initializeIAP()` — connect to store
- `purchaseSubscription(productId)` — trigger purchase flow
- `restorePurchases()` — restore previous purchases
- `validateReceipt(receipt)` — send to server for validation

Create server endpoint `stripe.validateAppStoreReceipt` (mutation):
- Validates receipt with Apple's verification API
- If valid, update user's subscription status + tier

Commit: "add App Store IAP setup with receipt validation"

### Task 9: IAP UI + Paywall

On the mobile pricing/upgrade screen:
- If iOS: show App Store subscription options (using `expo-in-app-purchases`)
- If Android: show Google Play options or link to web
- On purchase success: validate receipt → update subscription

Update mobile profile to show subscription status.

Commit: "add IAP paywall and subscription management on mobile"

---

## Chunk 5: Verification

### Task 10: Final Build Verification

- Run: `pnpm --filter @ironpulse/api test`
- Run: `pnpm --filter @ironpulse/shared test`
- Run: `pnpm --filter @ironpulse/web build`
- Run: `cd apps/mobile && npx vitest run`

Fix any issues.

Commit: "verify Phase 6 builds and tests pass"
