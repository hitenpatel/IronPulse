# Phase 5: Coaching Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add coaching features: coach tier billing, client management, program builder with template scheduling, program assignment, progress alerts, in-app messaging, and branded coach profiles.

**Architecture:** New Prisma models (Program, ProgramAssignment, Message, CoachProfile). Coach-tier gating via existing `User.tier`. Program builder uses JSON schedule (week → day → template). Messages are real-time via polling (WebSocket deferred). Coach dashboard is a new route group.

**Tech Stack:** tRPC, Prisma, Stripe (coach pricing), Next.js, Expo

---

## Chunk 1: Data Models + Coach Billing

### Task 1: Prisma Models

Add to schema:

```prisma
model Program {
  id            String   @id @default(uuid()) @db.Uuid
  coachId       String   @map("coach_id") @db.Uuid
  name          String
  description   String?
  durationWeeks Int      @map("duration_weeks")
  schedule      Json     // { "1": { "1": "templateId", "3": "templateId" }, ... }
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  coach       User                @relation("CoachPrograms", fields: [coachId], references: [id], onDelete: Cascade)
  assignments ProgramAssignment[]

  @@map("programs")
}

model ProgramAssignment {
  id        String   @id @default(uuid()) @db.Uuid
  programId String   @map("program_id") @db.Uuid
  athleteId String   @map("athlete_id") @db.Uuid
  coachId   String   @map("coach_id") @db.Uuid
  startedAt DateTime @map("started_at")
  status    String   @default("active") // active|completed|paused
  createdAt DateTime @default(now()) @map("created_at")

  program Program @relation(fields: [programId], references: [id], onDelete: Cascade)
  athlete User    @relation("AthleteAssignments", fields: [athleteId], references: [id], onDelete: Cascade)
  coach   User    @relation("CoachAssignments", fields: [coachId], references: [id], onDelete: Cascade)

  @@map("program_assignments")
}

model Message {
  id         String   @id @default(uuid()) @db.Uuid
  senderId   String   @map("sender_id") @db.Uuid
  receiverId String   @map("receiver_id") @db.Uuid
  content    String
  readAt     DateTime? @map("read_at")
  createdAt  DateTime @default(now()) @map("created_at")

  sender   User @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([senderId, receiverId, createdAt])
  @@map("messages")
}

model CoachProfile {
  id       String  @id @default(uuid()) @db.Uuid
  userId   String  @unique @map("user_id") @db.Uuid
  bio      String?
  specialties String[] @default([])
  imageUrl String? @map("image_url")
  isPublic Boolean @default(false) @map("is_public")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("coach_profiles")
}
```

Add relations to User: `coachPrograms Program[] @relation("CoachPrograms")`, `athleteAssignments ProgramAssignment[] @relation("AthleteAssignments")`, `coachAssignments ProgramAssignment[] @relation("CoachAssignments")`, `sentMessages Message[] @relation("SentMessages")`, `receivedMessages Message[] @relation("ReceivedMessages")`, `coachProfile CoachProfile?`

Commit: "add Program, ProgramAssignment, Message, and CoachProfile models"

### Task 2: Coach Tier Stripe Pricing

Modify `packages/api/src/routers/stripe.ts`:
- The existing `createCheckoutSession` already accepts a `priceId`. The coach tier is just a different Stripe price ID.
- Add `STRIPE_PRICE_COACH_MONTHLY` and `STRIPE_PRICE_COACH_YEARLY` env vars.
- After successful checkout (webhook), if the price matches a coach price, set `user.tier = "coach"`.

Update the Stripe webhook handler at `apps/web/src/app/api/stripe/webhook/route.ts`:
- On `checkout.session.completed`, check the subscription's price ID against coach price IDs
- If coach: update `tier = "coach"` in addition to `subscriptionStatus = "active"`

Add env vars to `.env.example`.

Commit: "add coach tier billing via Stripe pricing"

---

## Chunk 2: Coach Dashboard + Client Management

### Task 3: Coach tRPC Router

Create `packages/shared/src/schemas/coach.ts` + `packages/api/src/routers/coach.ts`:

Endpoints (all require `tier === "coach"` check):
- `coach.clients` (query) — list athletes with active ProgramAssignments under this coach. Include: name, email, last workout date, active program name.
- `coach.addClient` (mutation) — input: `{ athleteEmail }`. Find user by email, create a "pending" relationship (or just allow assignment later).
- `coach.removeClient` (mutation) — remove athlete's assignments
- `coach.clientProgress` (query) — input: `{ athleteId }`. Return athlete's recent workouts, cardio, body metrics, PRs for coach review.
- `coach.profile` (query) — get coach's profile
- `coach.updateProfile` (mutation) — update bio, specialties, imageUrl, isPublic

Register in root.

Commit: "add coach tRPC router with client management and profile"

### Task 4: Program Builder Router

Create `packages/shared/src/schemas/program.ts` + `packages/api/src/routers/program.ts`:

Endpoints:
- `program.create` (mutation) — create Program with name, description, durationWeeks, schedule (JSON)
- `program.update` (mutation) — update program details + schedule
- `program.delete` (mutation) — delete program + cascade assignments
- `program.list` (query) — coach's programs
- `program.getById` (query) — full program with schedule + template names resolved
- `program.assign` (mutation) — create ProgramAssignment for an athlete
- `program.unassign` (mutation) — remove assignment
- `program.listAssignments` (query) — all assignments for a program with athlete names + status

Register in root.

Commit: "add program builder tRPC router with create, assign, and schedule"

### Task 5: Messaging Router

Create `packages/shared/src/schemas/message.ts` + `packages/api/src/routers/message.ts`:

Endpoints:
- `message.send` (mutation) — create Message. Only allow between coach and their athletes.
- `message.conversations` (query) — list unique conversation partners with last message + unread count
- `message.history` (query) — paginated messages between current user and a partner, ordered by createdAt
- `message.markRead` (mutation) — mark messages as read (update readAt)

Register in root.

Commit: "add messaging tRPC router for coach-athlete communication"

---

## Chunk 3: Web Coach Dashboard

### Task 6: Coach Dashboard Pages

Create `apps/web/src/app/(app)/coach/` route group:

`apps/web/src/app/(app)/coach/page.tsx` — Coach dashboard overview:
- Client count, active programs count
- Recent client activity
- Link to clients, programs, messages

`apps/web/src/app/(app)/coach/clients/page.tsx` — Client management:
- List of athletes with last workout, active program
- "Add Client" input (email search)
- Click client → view their progress

`apps/web/src/app/(app)/coach/clients/[id]/page.tsx` — Client detail:
- Athlete's recent workouts, cardio, body metrics
- Assigned program with progress
- "Message" button

Gate all coach pages: if `user.tier !== "coach"`, redirect to upgrade page.

Commit: "add web coach dashboard with client management"

### Task 7: Program Builder UI

`apps/web/src/app/(app)/coach/programs/page.tsx` — Program list + create:
- List of coach's programs
- "Create Program" form: name, description, duration (weeks)
- Click program → builder

`apps/web/src/app/(app)/coach/programs/[id]/page.tsx` — Program builder:
- Visual schedule grid: rows = weeks (1-N), columns = days (Mon-Sun)
- Each cell: drag-and-drop or click to assign a workout template
- Template picker from `trpc.template.list.useQuery()`
- Save button updates the JSON schedule

Commit: "add program builder UI with weekly schedule grid"

### Task 8: Messaging UI

`apps/web/src/app/(app)/messages/page.tsx` — Messaging:
- Left sidebar: conversation list from `trpc.message.conversations.useQuery()`
- Right panel: message history with selected partner
- Input at bottom to send new message
- Poll for new messages every 5 seconds (simple approach, WebSocket later)
- Unread count badges

Commit: "add messaging UI for coach-athlete communication"

### Task 9: Coach Profile Page

Create `apps/web/src/app/coach/[id]/page.tsx` (public, no auth):
- Public coach profile: name, bio, specialties, image
- "View Programs" or "Contact" CTA
- Only visible if `isPublic === true`

Commit: "add public coach profile page"

---

## Chunk 4: Mobile Coach + Verification

### Task 10: Mobile Coach Screens

Create `apps/mobile/app/coach/` stack:
- `index.tsx` — if user is coach: client list. If athlete: assigned programs + coach info.
- `clients/[id].tsx` — client progress (coach only)
- `programs/[id].tsx` — program schedule view

Create `apps/mobile/app/messages/` stack:
- `index.tsx` — conversation list
- `[userId].tsx` — message thread with send input

Add "Coach" and "Messages" links to profile/dashboard.

Commit: "add coach dashboard and messaging on mobile"

### Task 11: Verification

Run: `pnpm --filter @ironpulse/web build`
Fix any issues.

Commit: "wire coaching navigation and verify builds"
