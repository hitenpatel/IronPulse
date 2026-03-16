# Phase 4: Social Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add social features: follow/followers, activity feed with visibility controls, challenges & leaderboards, and shareable workout/PR links.

**Architecture:** New Prisma models (Follow, ActivityFeedItem, Challenge, ChallengeParticipant). New `social` and `challenge` tRPC routers. Activity feed items auto-created on workout/cardio completion. PowerSync sync rules updated for social data. Web + mobile feed screens.

**Tech Stack:** tRPC, Prisma, PowerSync sync rules, Next.js, Expo

---

## Chunk 1: Data Models + Follow System

### Task 1: Prisma Models

Add to `packages/db/prisma/schema.prisma`:

```prisma
model Follow {
  id          String   @id @default(uuid()) @db.Uuid
  followerId  String   @map("follower_id") @db.Uuid
  followingId String   @map("following_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("Followers", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@map("follows")
}

model ActivityFeedItem {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  type        String
  referenceId String   @map("reference_id") @db.Uuid
  visibility  String   @default("followers")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("activity_feed_items")
}

model Challenge {
  id          String   @id @default(uuid()) @db.Uuid
  creatorId   String   @map("creator_id") @db.Uuid
  name        String
  type        String
  target      Decimal  @db.Decimal(10, 2)
  startsAt    DateTime @map("starts_at")
  endsAt      DateTime @map("ends_at")
  createdAt   DateTime @default(now()) @map("created_at")

  creator      User                   @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  participants ChallengeParticipant[]

  @@map("challenges")
}

model ChallengeParticipant {
  id          String   @id @default(uuid()) @db.Uuid
  challengeId String   @map("challenge_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  progress    Decimal  @default(0) @db.Decimal(10, 2)
  joinedAt    DateTime @default(now()) @map("joined_at")

  challenge Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([challengeId, userId])
  @@map("challenge_participants")
}
```

Add relations to User model: `followers Follow[] @relation("Following")`, `following Follow[] @relation("Followers")`, `activityFeedItems ActivityFeedItem[]`, `challenges Challenge[]`, `challengeParticipants ChallengeParticipant[]`

Run: `pnpm --filter @ironpulse/db exec prisma generate`

Commit: "add Follow, ActivityFeedItem, Challenge, and ChallengeParticipant models"

### Task 2: Social tRPC Router — Follow System

Create `packages/shared/src/schemas/social.ts`:
```typescript
import { z } from "zod";
export const followUserSchema = z.object({ userId: z.string().uuid() });
export const unfollowUserSchema = z.object({ userId: z.string().uuid() });
export const searchUsersSchema = z.object({ query: z.string().min(1) });
```

Export from `packages/shared/src/index.ts`.

Create `packages/api/src/routers/social.ts`:
- `social.follow` (mutation) — create Follow row, prevent self-follow
- `social.unfollow` (mutation) — delete Follow row
- `social.followers` (query) — list user's followers with name/email
- `social.following` (query) — list who user follows
- `social.searchUsers` (query) — search users by name/email for follow discovery
- `social.feed` (query) — paginated activity feed: own items + items from followed users where visibility is 'public' or 'followers'. Join with reference data (workout name, cardio type, PR value).

Register in root: `social: socialRouter`

Commit: "add social tRPC router with follow, unfollow, search, and activity feed"

### Task 3: Auto-Create Feed Items

Modify existing flows to auto-create ActivityFeedItem on:
- Workout completion (`packages/api/src/routers/workout.ts` — `complete` mutation)
- Cardio session creation (manual + GPS)

Add a helper `createFeedItem(db, userId, type, referenceId)` in `packages/api/src/lib/feed.ts`.

On workout complete: `createFeedItem(db, userId, "workout", workoutId)`
On cardio create: `createFeedItem(db, userId, "cardio", sessionId)`
On new PR: `createFeedItem(db, userId, "pr", personalRecordId)`

Default visibility: "followers"

Commit: "auto-create activity feed items on workout/cardio completion and PRs"

---

## Chunk 2: Challenges

### Task 4: Challenge tRPC Router

Create `packages/shared/src/schemas/challenge.ts`:
```typescript
import { z } from "zod";
export const createChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["volume", "distance", "streak"]),
  target: z.number().positive(),
  startsAt: z.string(),
  endsAt: z.string(),
});
export const joinChallengeSchema = z.object({ challengeId: z.string().uuid() });
```

Create `packages/api/src/routers/challenge.ts`:
- `challenge.create` (mutation) — create challenge + auto-join creator
- `challenge.join` (mutation) — add ChallengeParticipant
- `challenge.leave` (mutation) — remove participant
- `challenge.list` (query) — active challenges (where endsAt > now), with participant count
- `challenge.getById` (query) — challenge details + leaderboard (participants sorted by progress desc)
- `challenge.updateProgress` (mutation) — update participant's progress (called after workout/cardio)

Register in root: `challenge: challengeRouter`

Commit: "add challenge tRPC router with create, join, leaderboard"

---

## Chunk 3: Web Social UI

### Task 5: Web Activity Feed Page

Create `apps/web/src/app/(app)/feed/page.tsx`:
- "use client" page showing the social activity feed
- Uses `trpc.social.feed.useInfiniteQuery()`
- Each item: user avatar/name, activity type icon, description ("completed a 45-min workout", "ran 5km", "set a new PR"), timestamp
- Visibility badge (public/followers/private)
- Link to the referenced workout/cardio/PR

Add "Feed" link to the navigation (sidebar + bottom nav).

Commit: "add social activity feed page on web"

### Task 6: Web Follow + User Discovery

Create `apps/web/src/app/(app)/users/page.tsx`:
- Search input for finding users
- Results show name, email, follow/unfollow button
- Uses `trpc.social.searchUsers.useQuery()` and `trpc.social.follow/unfollow.useMutation()`

Add followers/following counts to the profile page.

Commit: "add user search and follow/unfollow on web"

### Task 7: Web Challenges Page

Create `apps/web/src/app/(app)/challenges/page.tsx`:
- List of active challenges with progress bars
- "Create Challenge" form
- Challenge detail: leaderboard table (rank, name, progress, target)
- Join/Leave buttons

Commit: "add challenges page with leaderboard on web"

### Task 8: Share Links

Create `apps/web/src/app/share/[type]/[id]/page.tsx`:
- Public page (no auth required) showing a shared workout or PR
- For workouts: exercise list + stats
- For PRs: exercise name + value
- OG meta tags for social sharing previews

Add "Share" button on workout detail and cardio detail pages that copies the share URL.

Commit: "add shareable workout and PR link pages"

---

## Chunk 4: Mobile Social UI + Verification

### Task 9: Mobile Activity Feed

Create `apps/mobile/app/feed/` stack with `index.tsx`:
- FlatList of feed items from `trpc.social.feed.query()`
- Same card format as web
- Accessible from dashboard (add "Feed" link)

Commit: "add social activity feed on mobile"

### Task 10: Mobile Challenges

Create `apps/mobile/app/challenges/` stack with `index.tsx`:
- List of active challenges
- Join/Leave buttons
- Challenge detail with leaderboard

Commit: "add challenges page on mobile"

### Task 11: Navigation + Verification

- Add "Feed" and "Challenges" links to dashboard (web + mobile)
- Run: `pnpm --filter @ironpulse/web build`
- Fix any issues

Commit: "wire social navigation and verify builds"
