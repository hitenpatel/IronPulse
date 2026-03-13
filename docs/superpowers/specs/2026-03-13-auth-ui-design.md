# Auth UI Design Spec

**Goal:** Implement a complete authentication UI with login, signup, forgot/reset password, magic link sign-in, OAuth (Google + Apple), and post-signup onboarding.

**Scope:** Web only (Next.js). Replaces the existing `/login` page with a full auth flow across multiple pages.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, shadcn/ui (new-york), lucide-react, NextAuth v5, Resend (email).

**Related specs:**
- Master design: `docs/superpowers/specs/2026-03-12-ironpulse-design.md`
- Core data layer: `docs/superpowers/specs/2026-03-12-core-data-layer-design.md`

---

## Architecture

Split layout pattern. A new `(auth)` route group provides the shared layout — brand panel on the left (40%), form panel on the right (60%). On mobile, the brand panel is hidden and the form fills the screen with a small logo inline.

All auth pages share this layout. Route protection is handled by Next.js middleware instead of layout-level redirects.

**Auth methods:** Email/password, Google OAuth, Apple OAuth, magic link (passwordless email).

**Email service:** Resend — used for magic link emails and password reset emails.

---

## File Structure

```
apps/web/
├── src/
│   ├── middleware.ts                          # CREATE — route protection
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                     # CREATE — split layout (brand + form)
│   │   │   ├── login/
│   │   │   │   └── page.tsx                   # CREATE — sign in page
│   │   │   ├── signup/
│   │   │   │   └── page.tsx                   # CREATE — registration page
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx                   # CREATE — request password reset
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx                   # CREATE — set new password
│   │   │   └── onboarding/
│   │   │       └── page.tsx                   # CREATE — post-signup setup
│   │   ├── api/auth/
│   │   │   ├── [...nextauth]/route.ts         # EXISTS — keep
│   │   │   ├── signup/route.ts                # DELETE — replaced by tRPC
│   │   │   └── magic-link/route.ts            # CREATE — verify magic link token
│   │   ├── login/page.tsx                     # DELETE — replaced by (auth)/login
│   │   └── (app)/layout.tsx                   # MODIFY — remove redirect logic
│   └── lib/
│       └── auth.ts                            # MODIFY — add magic link, onboardingComplete to JWT
packages/api/src/
│   ├── lib/
│   │   └── email.ts                           # CREATE — Resend email sending utility
│   └── routers/
│       └── auth.ts                            # MODIFY — add magic link + password reset mutations
packages/shared/src/schemas/
│   └── auth.ts                                # MODIFY — add new schemas
packages/db/prisma/
│   └── schema.prisma                          # MODIFY — add tokens + onboardingComplete
```

---

## Data Model Changes

### User Model

Add field:

```prisma
onboardingComplete Boolean @default(false) @map("onboarding_complete")
```

**Migration note:** Run a data migration to set `onboarding_complete = true` for all existing users, so they are not forced through onboarding on next login. The Prisma migration should include: `UPDATE users SET onboarding_complete = true WHERE id IS NOT NULL;`

Add relation field to User model:

```prisma
passwordResetTokens PasswordResetToken[]
```

### New Models

Follow existing conventions: `@db.Uuid` on all id/FK fields, `@map()` on snake_case columns, `@@map()` for table names.

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  used      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("password_reset_tokens")
}

model MagicLinkToken {
  id        String   @id @default(uuid()) @db.Uuid
  email     String
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  used      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("magic_link_tokens")
}
```

Note: `MagicLinkToken` has no FK to User because it supports creating new users — the email is the lookup key. Orphan cleanup is handled by expiry-based TTL (delete tokens older than 24 hours via a periodic job or on-write cleanup).

---

## Pages

### Auth Layout (`(auth)/layout.tsx`)

Shared layout for all auth pages.

**Desktop:** `flex` row — brand panel (40% width, `hidden lg:flex`) + form panel (60%, centered content, `max-w-sm`).

**Mobile:** Brand panel hidden. Form fills screen with padding. Small logo + "IronPulse" wordmark shown inline above the form heading.

**Brand panel:**
- Full height, gradient background in purple/dark tones matching app primary color
- Centered vertically: app logo/icon (56px rounded square, primary color), "IronPulse" wordmark, tagline "Track your strength. Own your progress."
- Static — same on all auth pages

**Form panel:**
- `bg-background` (app dark theme)
- Content centered vertically and horizontally
- Max width ~400px for form content
- Uses shadcn `Input`, `Button`, `Label` components

### Login Page (`/login`)

**Content:**
1. Heading: "Welcome back"
2. Subtitle: "Sign in to your account"
3. Email input (shadcn Input + Label)
4. Password input
5. "Forgot password?" link (right-aligned, below password, links to `/forgot-password`)
6. "Sign in" primary button (full width)
7. Divider: "or continue with"
8. Three outlined buttons stacked:
   - "Continue with Google" (Google color icon)
   - "Continue with Apple" (Apple icon)
   - "Email me a sign-in link" (Mail icon from lucide)
9. Footer: "Don't have an account? **Sign up**" (link to `/signup`)

**Sign-in flow:**
- Email/password: calls NextAuth `signIn("credentials", ...)`, redirects to `/dashboard` (or `/onboarding` if not completed)
- Google/Apple: calls NextAuth `signIn("google")` / `signIn("apple")`, NextAuth handles redirect
- Magic link: see magic link sub-flow below

**Error handling:** Inline field validation errors. Auth failure shows inline error banner: "Invalid email or password".

### Magic Link Sub-Flow (shared by login and signup)

Clicking "Email me a sign-in link" replaces the form content (same page, state toggle) with:

1. Heading: "Sign in with email"
2. Email input
3. "Send link" primary button
4. "Back to sign in" link (or "Back to sign up" on the signup page)

On submit: calls `auth.sendMagicLink` mutation.

After sending, shows confirmation:
1. Mail icon (large, muted)
2. "Check your email"
3. "We sent a sign-in link to **{email}**"
4. "Back to sign in" link

### Signup Page (`/signup`)

**Content:**
1. Heading: "Create your account"
2. Subtitle: "Start tracking your fitness"
3. Name input
4. Email input
5. Password input (helper text: "At least 8 characters")
6. "Create account" primary button (full width)
7. Divider: "or continue with"
8. Same three OAuth/magic link buttons as login
9. Footer: "Already have an account? **Sign in**" (link to `/login`)

**On success (credentials):** Calls `auth.signUp` tRPC mutation (creates user + account), then auto sign-in via NextAuth `signIn("credentials", ...)`, redirects to `/onboarding`.

**On success (OAuth):** NextAuth `signIn` callback creates user + account if new. Redirects to `/onboarding` if `onboardingComplete` is false, `/dashboard` otherwise.

**Validation:**
- Name: required, 1-100 characters
- Email: required, valid email format
- Password: required, minimum 8 characters

**Error handling:** Inline field errors. Duplicate email: "An account with this email already exists".

### Forgot Password (`/forgot-password`)

**Content:**
1. Heading: "Reset your password"
2. Subtitle: "Enter your email and we'll send you a reset link"
3. Email input
4. "Send reset link" primary button
5. "Back to sign in" link (links to `/login`)

**On submit:** Calls `auth.requestPasswordReset` mutation. Always shows success message regardless of whether email exists (prevents email enumeration): "If an account exists with that email, we've sent a reset link."

### Reset Password (`/reset-password?token=...`)

**Content:**
1. Heading: "Set new password"
2. New password input
3. Confirm password input
4. "Reset password" primary button

**On submit:** Calls `auth.resetPassword` mutation with token + new password.

**On success:** Auto sign-in, redirect to `/dashboard`.

**Invalid/expired token:** Shows error message with link to `/forgot-password`: "This reset link has expired or is invalid."

**Validation:**
- Password: minimum 8 characters
- Confirm password: must match

### Onboarding (`/onboarding`)

Uses the same `(auth)` split layout.

**Content:**
1. Heading: "Let's get you set up"
2. Name input (pre-filled from OAuth profile or signup, editable)
3. Unit preference: two large toggle buttons side by side — "Metric (kg, km)" and "Imperial (lbs, mi)". Default: Metric.
4. "Get started" primary button

**On submit:** Calls `user.completeOnboarding` mutation (new) — updates name, unitSystem, sets `onboardingComplete = true`. Redirects to `/dashboard`.

---

## Backend Changes

### Shared Schemas (`packages/shared/src/schemas/auth.ts`)

Add:

```typescript
export const sendMagicLinkSchema = z.object({
  email: z.string().email(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

// Note: completeOnboardingSchema lives in auth.ts alongside the other auth schemas,
// even though the mutation is in the user router. This keeps all onboarding-related
// schemas grouped with the auth flow they belong to.
export const completeOnboardingSchema = z.object({
  name: z.string().min(1).max(100),
  unitSystem: z.enum(["metric", "imperial"]),
});
```

### Auth Router (`packages/api/src/routers/auth.ts`)

Add three public mutations:

**`auth.sendMagicLink`:** Generates a random token (crypto.randomUUID), stores in `MagicLinkToken` with 15-minute expiry, sends email via Resend with link to `/api/auth/magic-link?token=...`. Returns `{ ok: true }` regardless of whether email exists (prevents enumeration).

**`auth.requestPasswordReset`:** Looks up user by email. If found, generates token, stores in `PasswordResetToken` with 1-hour expiry, sends email via Resend with link to `/reset-password?token=...`. Returns `{ ok: true }` regardless (prevents enumeration).

**`auth.resetPassword`:** Validates token (exists, not expired, not used), marks token as used, hashes new password, updates user's `passwordHash`. Returns `{ ok: true }`.

### User Router (`packages/api/src/routers/user.ts`)

Add protected mutation:

**`user.completeOnboarding`:** Updates name, unitSystem, sets `onboardingComplete = true`. Returns updated user.

### Magic Link API Route (`/api/auth/magic-link/route.ts`)

GET handler:
1. Reads `token` from query params
2. Looks up `MagicLinkToken` — validates exists, not expired, not used
3. Marks token as used
4. Looks up user by email — creates user if none exists (no password, name from email prefix)
5. Creates Account record for email provider if needed (check for existing `[provider, providerAccountId]` first to avoid unique constraint violations)
6. Signs in by generating a JWT directly using NextAuth's `encode()` function and setting it as the session cookie. This avoids the need for a custom NextAuth provider — we manually create the same JWT that NextAuth would, with the user's id, email, name, and custom fields (tier, subscriptionStatus, unitSystem, onboardingComplete), then set it via `cookies().set()` with the NextAuth cookie name.
7. Redirects to `/onboarding` if `onboardingComplete` is false, `/dashboard` otherwise

### Email Utility (`packages/api/src/lib/email.ts`)

Lives in `packages/api` alongside the tRPC routers that call it, so imports work without cross-package dependencies.

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail(email: string, token: string) { ... }
export async function sendPasswordResetEmail(email: string, token: string) { ... }
```

Plain text emails for MVP. Sender: configurable via `EMAIL_FROM` env var.

### NextAuth Changes (`apps/web/src/lib/auth.ts`)

- Add `onboardingComplete` to JWT token enrichment in the `jwt` callback (load from DB alongside tier/subscriptionStatus/unitSystem)
- Add `onboardingComplete` to session in the `session` callback
- Handle missing `onboardingComplete` in JWT gracefully: if the field is undefined (pre-existing JWT from before this deploy), treat it as `true` (existing users have already been migrated via the data migration)
- Update `signIn` callback for OAuth: set `onboardingComplete = false` for new users created via OAuth

---

## Middleware (`apps/web/src/middleware.ts`)

Uses NextAuth's middleware wrapper. Defines route protection rules:

**Public routes** (no auth required): `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/api/auth/*`, `/api/trpc/*`

**Auth redirect rules:**
- Unauthenticated → accessing protected route → redirect to `/login`
- Authenticated + `onboardingComplete = false` → accessing `(app)` route → redirect to `/onboarding`
- Authenticated + `onboardingComplete = true` → accessing `/login`, `/signup` → redirect to `/dashboard`
- Authenticated + `onboardingComplete = false` → accessing `/login`, `/signup` → redirect to `/onboarding`

**Matcher config:** Excludes static files, images, favicon.

---

## Cleanup

- Delete `apps/web/src/app/login/page.tsx` (old login page)
- Delete `apps/web/src/app/api/auth/signup/route.ts` (replaced by tRPC auth.signUp which already exists)
- Remove `redirect()` call from `apps/web/src/app/(app)/layout.tsx` (middleware handles it)

---

## New Dependencies

- `resend` — email sending service (install in `packages/api` where the email utility lives)

**Environment variables:**
- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — sender email address (e.g., `noreply@ironpulse.app`)

---

## User Flows

### Email/Password Sign Up
1. User navigates to `/signup`
2. Fills name, email, password
3. Clicks "Create account"
4. Account created, auto sign-in
5. Redirected to `/onboarding`
6. Sets unit preference, clicks "Get started"
7. Redirected to `/dashboard`

### OAuth Sign In (New User)
1. User navigates to `/login` or `/signup`
2. Clicks "Continue with Google"
3. Completes Google OAuth
4. Account auto-created by NextAuth
5. Redirected to `/onboarding` (onboardingComplete is false)
6. Sets name + unit preference
7. Redirected to `/dashboard`

### OAuth Sign In (Returning User)
1. User navigates to `/login`
2. Clicks "Continue with Google"
3. Completes Google OAuth
4. Redirected to `/dashboard` (onboardingComplete is true)

### Magic Link Sign In
1. User navigates to `/login`
2. Clicks "Email me a sign-in link"
3. Enters email, clicks "Send link"
4. Receives email with link
5. Clicks link → `/api/auth/magic-link?token=...`
6. Token verified, signed in
7. If new user: redirected to `/onboarding`
8. If returning user: redirected to `/dashboard`

### Password Reset
1. User navigates to `/login`, clicks "Forgot password?"
2. Enters email on `/forgot-password`, clicks "Send reset link"
3. Receives email with link
4. Clicks link → `/reset-password?token=...`
5. Enters new password + confirmation
6. Password updated, auto sign-in
7. Redirected to `/dashboard`

---

## Out of Scope

- Email verification (post-MVP)
- Two-factor authentication
- Passkey/biometric auth
- Account linking UI (connect additional OAuth providers)
- Account deletion
- Rate limiting on auth endpoints (handled separately)
- HTML email templates (plain text for MVP)
