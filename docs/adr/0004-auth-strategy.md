# 0004. NextAuth + mobile Bearer tokens for auth

- **Status:** Accepted
- **Date:** 2026-01-24
- **Deciders:** @hiten

## Context

We need authentication that works across:

- Web SPA (cookie session, redirect-based OAuth).
- Native mobile app (no cookies in the same sense; needs a token that can be stored in the keychain).
- Passkeys (WebAuthn) on both platforms.
- Three sign-in methods: email+password, Google OAuth, Apple OAuth; plus passkey add/replace after initial sign-in.

Constraints:

- GDPR — sessions and tokens must be revocable on account deletion.
- Security — we can't rely on secrets in client bundles; all token minting happens server-side.
- Monorepo with shared session shape between web and mobile.

## Decision

Use **NextAuth v5 (Auth.js)** on the web for cookie-based session management and provider orchestration, then mint a short-lived Bearer token per mobile sign-in so mobile clients can hit tRPC without cookies.

### Web

- NextAuth with Credentials (password + passkey) and Google/Apple providers.
- JWT session strategy (no DB session table; user metadata is on the token).
- Custom fields on `Session.user` (`tier`, `subscriptionStatus`, `unitSystem`, `onboardingComplete`, `defaultRestSeconds`) declared via module augmentation in `apps/web/src/types/next-auth.d.ts`.
- `httpOnly`, `SameSite=Lax`, `Secure` cookies.

### Mobile

- `auth.mobileSignIn` procedure accepts email+password or a passkey assertion, mints an HS256 JWT via `packages/api/src/lib/mobile-auth.ts` signed with `NEXTAUTH_SECRET`, and returns it.
- Mobile stores the token in `react-native-keychain` (via the thin `secure-store.ts` wrapper).
- `@trpc/client` attaches the token as `Authorization: Bearer <token>` on every request.
- `protectedProcedure` accepts either a NextAuth session cookie (web) or a valid Bearer token (mobile).

### Passkeys

- Registration + authentication assertions go through `@simplewebauthn/server` (`packages/api/src/lib/passkey.ts`).
- `WEBAUTHN_RP_ID` and `WEBAUTHN_RP_ORIGIN` env vars scope credentials to the deployment domain.
- Deleting the last passkey requires at least one alternative auth method (password or OAuth account) — enforced by `hasAlternativeAuthMethod()`.

## Consequences

### Good

- One shared user/session shape via module augmentation — typed end-to-end.
- Mobile Bearer tokens are stateless — no DB session lookup on every request.
- Passkeys work identically on web (WebAuthn) and mobile (`react-native-passkeys`).
- OAuth providers are declaratively configured; adding a new provider is a few lines.

### Bad

- Two parallel auth paths (cookie vs. Bearer) in the protected procedure means two test matrices.
- JWT sessions can't be revoked individually — on compromise we rotate `NEXTAUTH_SECRET`, which invalidates every active session.
- NextAuth is still beta at v5 (as of 2026-01); we pin to a specific `5.0-beta.*` and update deliberately.

### Neutral

- `apps/web/src/lib/auth.ts` is the single entry; every server-rendered page reads `await auth()`.

## Alternatives considered

- **Rolled-our-own JWT** — rejected: OAuth provider plumbing alone is multiple weeks; NextAuth gets us there on day one.
- **Clerk / Auth0 / Supabase Auth** — rejected: vendor lock-in, opinionated user schema, per-MAU cost at scale, and the database-owned-by-vendor model conflicts with our self-host requirement.
- **Session DB + opaque tokens** — rejected: every request would do a DB lookup. JWT tradeoff (no individual revoke) is acceptable for our threat model.

## Follow-ups

- `docs/bookstack/csrf-protection.md` documents the CSRF posture across the auth surface (see ticket #181).
- If we add partner API access, we'll add a dedicated API-token flow separate from user Bearer tokens.
