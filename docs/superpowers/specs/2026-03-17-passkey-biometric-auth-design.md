# Passkey & Biometric Auth — Design Specification

Web passkeys (WebAuthn) as a full login method and mobile biometric unlock (Face ID / Touch ID) for quick session access.

## Scope

- **Web**: Passkey registration, login, and management via `@simplewebauthn/server` + `@simplewebauthn/browser`, integrated through tRPC endpoints
- **Mobile**: Biometric unlock via `expo-local-authentication`, gating access to the existing JWT stored in SecureStore
- Passkeys serve as a full authentication method on web (can replace password)
- Biometrics serve as quick unlock on mobile (session already persisted)

## Data Model

### Passkey Table

```prisma
model Passkey {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @map("user_id") @db.Uuid
  credentialId        String   @unique @map("credential_id")       // base64url-encoded credential ID
  publicKey           Bytes    @map("public_key")                   // COSE public key
  counter             BigInt   @default(0)                          // signature counter for replay detection
  deviceType          String   @map("device_type")                  // "singleDevice" | "multiDevice"
  backedUp            Boolean  @default(false)                      // whether credential is backed up (iCloud Keychain, etc.)
  transports          String[] @default([])                         // ["internal", "usb", "ble", "nfc"]
  name                String?                                       // user-provided label ("MacBook Pro", "YubiKey")
  lastUsedAt          DateTime? @map("last_used_at")
  createdAt           DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("passkeys")
}
```

Add `passkeys Passkey[]` to the User model. Maximum 5 passkeys per user, enforced at the application level.

### PasskeyChallenge Table

```prisma
model PasskeyChallenge {
  id        String   @id @default(uuid()) @db.Uuid
  challenge String   @unique
  userId    String?  @map("user_id") @db.Uuid  // null for login challenges (discoverable credentials)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([expiresAt])
  @@map("passkey_challenges")
}
```

- Registration challenges include `userId` (must be authenticated)
- Login challenges have `userId = null` (pre-auth, discoverable credentials)
- 5-minute expiry, deleted after use or on expiry
- Stale challenges cleaned up on every Nth challenge creation (every 10th): `DELETE FROM passkey_challenges WHERE expires_at < NOW()`. The `@@index([expiresAt])` ensures this is an index scan, not a sequential scan.

No new DB model needed for mobile biometric — purely client-side.

## Web Passkey Flow

### Registration

1. Authenticated user navigates to Settings → Security → "Add Passkey"
2. Client calls `auth.passkeyRegisterOptions` → server generates registration options via `generateRegistrationOptions()` (challenge, RP ID, user info, excludes existing credential IDs)
3. Challenge stored in `PasskeyChallenge` table with 5-min expiry
4. Client calls `startRegistration()` from `@simplewebauthn/browser` — triggers browser passkey dialog
5. Client sends attestation response to `auth.passkeyRegisterVerify` → server verifies `challenge.userId === ctx.user.id`, calls `verifyRegistrationResponse()`, enforces 5-passkey limit via `SELECT COUNT(*) ... FOR UPDATE` within a transaction, creates `Passkey` row
6. User can optionally name the passkey ("MacBook Pro", "Security Key")

### Login

1. Login page shows "Sign in with passkey" button alongside email/password and OAuth
2. Client calls `auth.passkeyLoginOptions` → server generates authentication options via `generateAuthenticationOptions()` (no user ID — discoverable credentials)
3. Client calls `startAuthentication()` — triggers browser passkey dialog
4. Client sends assertion response to `auth.passkeyLoginVerify` → server calls `verifyAuthenticationResponse()`, updates counter + lastUsedAt
5. Server returns a short-lived, signed passkey login token (random UUID stored in a `PasskeyLoginToken` table with 30-second expiry, or signed with HMAC using `NEXTAUTH_SECRET`)
6. Client calls NextAuth `signIn("credentials", { passkeyToken })` which hits a second Credentials provider ("passkey") that verifies the token and returns the user object — this keeps the existing JWT/session callback chain intact

### Why tRPC instead of NextAuth's built-in WebAuthn provider

NextAuth's WebAuthn provider requires `@auth/prisma-adapter` which expects a different schema shape (NextAuth's `User`/`Account`/`Session` tables). IronPulse uses a custom Prisma schema with manual JWT callbacks. Using `@simplewebauthn` directly via tRPC keeps it consistent with how all other auth flows work (credentials, OAuth sign-in callback) — no adapter migration needed.

### Management

- Settings → Security shows registered passkeys as a list
- Each row: name (editable), device type icon, last used date, delete button
- "Add passkey" button (disabled at 5 limit)
- Rename and delete via tRPC endpoints
- Deleting a passkey checks that the user still has at least one other auth method (another passkey, password, or OAuth) — same guard as password removal. Both `passkeyDelete` and `removePassword` use a serializable transaction to prevent race conditions between concurrent requests.

### Password Removal

- Users can optionally remove their password once they have a passkey or OAuth provider linked
- Requires re-authentication before proceeding: user must confirm their current password OR complete a fresh passkey assertion
- Warning shown: "Make sure you have access to your passkey device. If you lose it and have no OAuth provider linked, you'll be locked out."
- `auth.removePassword` mutation verifies re-auth, then checks user has at least one passkey or OAuth account within a serializable transaction before allowing removal

## Mobile Biometric Unlock

### Setup

1. After successful email/password login, prompt user: "Enable Face ID / Touch ID for quick unlock?"
2. If accepted, call `LocalAuthentication.authenticateAsync()` to verify biometric works
3. Store flag in SecureStore: `biometric-enabled = "true"`
4. JWT token and user data remain in SecureStore as they already are

### Unlock

1. App opens → AuthProvider's `restore()` checks `biometric-enabled` flag
2. If enabled, show biometric prompt before restoring session from SecureStore
3. Success → restore token + user, proceed normally
4. Failure → fall back to device passcode (OS handles via `authenticateAsync({ fallbackLabel: "Use Passcode" })`)
5. Passcode also fails / user cancels → show full login screen (email/password)

### Edge Cases

- **Biometric not enrolled on device**: Don't offer the option. Check `hasHardwareAsync()` and `isEnrolledAsync()` before showing the prompt.
- **Token expired while locked**: After biometric unlock, the existing `trpc.auth.getSession.query()` validates the token. If expired, redirect to full login.
- **User disables biometrics in OS settings**: `isEnrolledAsync()` returns false on next app open → skip biometric, go straight to session restore (token is still valid).
- **Sign out**: Clear `biometric-enabled` flag alongside token/user data.

### Settings

- Profile → Security → "Biometric Unlock" toggle
- Shows "Face ID" or "Touch ID" label based on `supportedAuthenticationTypesAsync()`

## Relying Party Configuration

- `rpID`: domain-based (`ironpulse.app` in prod, `localhost` in dev)
- `rpName`: "IronPulse"
- `origin`: `https://ironpulse.app` (prod), `http://localhost:3000` (dev)
- Configured via env vars: `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_ORIGIN`

## tRPC Endpoints

Passkey endpoints live in a separate `passkey` router (consistent with the codebase pattern of one router per domain — social, coach, challenge, etc.).

| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `passkey.registerOptions` | mutation | protected | Generate registration challenge |
| `passkey.registerVerify` | mutation | protected | Verify attestation, create passkey |
| `passkey.loginOptions` | mutation | public | Generate login challenge |
| `passkey.loginVerify` | mutation | public | Verify assertion, return session |
| `passkey.list` | query | protected | List user's passkeys |
| `passkey.rename` | mutation | protected | Rename a passkey |
| `passkey.delete` | mutation | protected | Delete a passkey |
| `passkey.removePassword` | mutation | protected | Remove password (requires passkey or OAuth) |

## Shared Schemas

Added to `packages/shared/src/schemas/auth.ts`:

- `passkeyRegisterVerifySchema`: wraps `@simplewebauthn/types` `RegistrationResponseJSON` via `z.custom<RegistrationResponseJSON>()`, plus `name: z.string().max(50).optional()`
- `passkeyLoginVerifySchema`: wraps `AuthenticationResponseJSON` via `z.custom<AuthenticationResponseJSON>()`
- `passkeyRenameSchema`: `{ passkeyId: z.string().uuid(), name: z.string().min(1).max(50) }`
- `passkeyDeleteSchema`: `{ passkeyId: z.string().uuid() }`
- `removePasswordSchema`: `{ currentPassword: z.string().optional(), passkeyAssertion: z.custom<AuthenticationResponseJSON>().optional() }` — one of the two re-auth methods required

## Rate Limiting

- **Registration**: 5 attempts/hour per user. New rate limit config in `packages/api/src/lib/rate-limit.ts`: key pattern `passkey-reg:${userId}`, window 3,600,000ms, max 5. Applied via a new `passkeyRegRateLimitedProcedure` or inline check in the endpoint.
- **Login**: 5 attempts/minute per IP, sharing the existing `auth:${ip}` rate limit pool with password login (via `authRateLimitedProcedure`). Sharing the pool prevents attackers from bypassing limits by switching auth methods.

## Security Considerations

- `attestation: "none"` for registration options — no attestation certificate validation needed for a consumer fitness app
- Challenge expiry (5 min) prevents replay attacks
- Challenge-to-user binding: `passkeyRegisterVerify` verifies `challenge.userId === ctx.user.id`
- Signature counter verification detects cloned credentials
- Discoverable credentials for login (no username required)
- Password removal requires re-authentication (current password or fresh passkey assertion) and at least one alternative auth method
- Both `passkeyDelete` and `removePassword` use serializable transactions to prevent race conditions
- All passkey management endpoints require authentication
- Passkey CRUD scoped to authenticated user's own credentials
- 5-passkey limit enforced via `SELECT COUNT(*) ... FOR UPDATE` within a transaction

## UI Touchpoints

### Web — Login Page

"Sign in with passkey" button below email/password form, alongside Google/Apple OAuth buttons. Calls `startAuthentication()` on click, creates session on success.

### Web — Settings → Security

- "Passkeys" card: list of registered passkeys (name, device type icon, last used, created date, delete button), "Add passkey" button
- "Password" card: option to remove password (only if passkey or OAuth linked, with warning dialog)

### Mobile — Login Screen

No passkey button. Mobile uses biometric unlock, not WebAuthn.

### Mobile — Profile → Security

"Biometric Unlock" toggle with Face ID / Touch ID label. Toggling on triggers `authenticateAsync()` to confirm. Toggling off clears the flag.

## Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `@simplewebauthn/server` | `packages/api` | Server-side WebAuthn registration/authentication |
| `@simplewebauthn/browser` | `apps/web` | Browser-side passkey dialog triggers |
| `@simplewebauthn/types` | `packages/api`, `apps/web` | Shared TypeScript types |
| `expo-local-authentication` | `apps/mobile` | Face ID / Touch ID |

## Testing Strategy

- **Unit tests** for tRPC passkey endpoints: mock `@simplewebauthn/server` functions, test challenge creation/expiry, credential CRUD, 5-passkey limit enforcement, password removal guard
- **Unit tests** for mobile biometric flow: mock `expo-local-authentication`, test enable/disable toggle, fallback behavior when biometrics unavailable
- **Integration tests** for passkey registration + login: use SimpleWebAuthn with test fixtures against real DB
- **No E2E for WebAuthn**: Browser passkey dialogs can't be automated — test the tRPC layer thoroughly instead

## Migration

Single Prisma migration adding `passkeys` and `passkey_challenges` tables. Non-breaking — no changes to existing tables.
