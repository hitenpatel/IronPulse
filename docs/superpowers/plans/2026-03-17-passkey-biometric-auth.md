# Passkey & Biometric Auth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WebAuthn passkey authentication on web and biometric unlock (Face ID / Touch ID) on mobile.

**Architecture:** Web passkeys use `@simplewebauthn/server` + `@simplewebauthn/browser` via tRPC endpoints, with a second NextAuth Credentials provider for session bridging. Mobile biometrics use `expo-local-authentication` to gate access to the existing JWT in SecureStore.

**Tech Stack:** `@simplewebauthn/server`, `@simplewebauthn/browser`, `@simplewebauthn/types`, `expo-local-authentication`, Prisma, tRPC, NextAuth v5, Vitest

---

## File Map

**New files:**
- `packages/api/src/lib/passkey.ts` — WebAuthn helper functions wrapping `@simplewebauthn/server`
- `packages/api/src/routers/passkey.ts` — tRPC router for passkey CRUD + auth
- `packages/api/__tests__/passkey.test.ts` — integration tests for passkey router
- `apps/web/src/lib/passkey.ts` — client-side WebAuthn helpers wrapping `@simplewebauthn/browser`
- `apps/web/src/components/passkey-login-button.tsx` — "Sign in with passkey" button
- `apps/web/src/app/(app)/profile/security/page.tsx` — security settings page (passkey management + password removal)
- `apps/mobile/lib/biometric.ts` — biometric unlock helpers wrapping `expo-local-authentication`
- `apps/mobile/components/biometric-prompt.tsx` — post-login biometric enrollment prompt

**Modified files:**
- `packages/db/prisma/schema.prisma` — add Passkey + PasskeyChallenge models
- `packages/shared/src/schemas/auth.ts` — add passkey Zod schemas
- `packages/shared/src/index.ts` — re-export new schemas
- `packages/api/src/lib/rate-limit.ts` — add `passkeyReg` rate limit config
- `packages/api/src/root.ts` — register passkey router
- `apps/web/src/lib/auth.ts` — add second Credentials provider for passkey login
- `apps/web/src/app/(auth)/login/page.tsx` — add passkey login button
- `apps/web/src/app/(app)/profile/page.tsx` — add link to security settings
- `apps/mobile/lib/auth.tsx` — integrate biometric gate in `restore()`
- `apps/mobile/app/(tabs)/profile.tsx` — add biometric toggle + security section

---

## Chunk 1: Database + Schemas + Dependencies

### Task 1: Install Dependencies

**Files:**
- Modify: `packages/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install server-side WebAuthn packages**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/api add @simplewebauthn/server @simplewebauthn/types
```

- [ ] **Step 2: Install browser-side WebAuthn package**

```bash
pnpm --filter @ironpulse/web add @simplewebauthn/browser @simplewebauthn/types
```

- [ ] **Step 3: Install shared types package**

```bash
pnpm --filter @ironpulse/shared add @simplewebauthn/types
```

- [ ] **Step 4: Install mobile biometric package**

```bash
pnpm --filter @ironpulse/mobile add expo-local-authentication
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/package.json apps/web/package.json apps/mobile/package.json packages/shared/package.json pnpm-lock.yaml
git commit -m "add WebAuthn and biometric dependencies"
```

### Task 2: Add Prisma Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add Passkey and PasskeyChallenge models to schema.prisma**

Add after the `MagicLinkToken` model (after line 88):

```prisma
model Passkey {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  credentialId String    @unique @map("credential_id")
  publicKey    Bytes     @map("public_key")
  counter      BigInt    @default(0)
  deviceType   String    @map("device_type")
  backedUp     Boolean   @default(false) @map("backed_up")
  transports   String[]  @default([])
  name         String?
  lastUsedAt   DateTime? @map("last_used_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("passkeys")
}

model PasskeyChallenge {
  id        String   @id @default(uuid()) @db.Uuid
  challenge String   @unique
  userId    String?  @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([expiresAt])
  @@map("passkey_challenges")
}
```

Add `passkeys Passkey[]` to the User model's relation fields (after the `pushTokens` line).

- [ ] **Step 2: Generate Prisma client and create migration**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/db exec prisma migrate dev --name add-passkey-tables
```

Expected: Migration created, client generated successfully.

- [ ] **Step 3: Verify migration**

```bash
pnpm --filter @ironpulse/db exec prisma migrate status
```

Expected: All migrations applied, no pending.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "add Passkey and PasskeyChallenge database models"
```

### Task 3: Add Shared Zod Schemas

**Files:**
- Modify: `packages/shared/src/schemas/auth.ts`

- [ ] **Step 1: Add passkey schemas to auth.ts**

Append to the end of `packages/shared/src/schemas/auth.ts`:

```typescript
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

export const passkeyRegisterVerifySchema = z.object({
  attestation: z.custom<RegistrationResponseJSON>(),
  name: z.string().max(50).optional(),
});
export type PasskeyRegisterVerifyInput = z.infer<typeof passkeyRegisterVerifySchema>;

export const passkeyLoginVerifySchema = z.object({
  assertion: z.custom<AuthenticationResponseJSON>(),
  challenge: z.string(), // echo back the challenge from loginOptions for exact lookup
});
export type PasskeyLoginVerifyInput = z.infer<typeof passkeyLoginVerifySchema>;

export const passkeyRenameSchema = z.object({
  passkeyId: z.string().uuid(),
  name: z.string().min(1).max(50),
});
export type PasskeyRenameInput = z.infer<typeof passkeyRenameSchema>;

export const passkeyDeleteSchema = z.object({
  passkeyId: z.string().uuid(),
});
export type PasskeyDeleteInput = z.infer<typeof passkeyDeleteSchema>;

export const removePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  passkeyAssertion: z.custom<AuthenticationResponseJSON>().optional(),
});
export type RemovePasswordInput = z.infer<typeof removePasswordSchema>;
```

- [ ] **Step 2: Re-export new schemas from shared index**

The schemas are already re-exported via `export * from "./schemas/auth"` in `packages/shared/src/index.ts` — no changes needed. Verify the new exports are accessible:

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/shared exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/
git commit -m "add passkey Zod schemas to shared package"
```

### Task 4: Add Passkey Registration Rate Limit

**Files:**
- Modify: `packages/api/src/lib/rate-limit.ts`

- [ ] **Step 1: Add passkeyReg rate limit config**

In `packages/api/src/lib/rate-limit.ts`, add to the `RATE_LIMITS` object:

```typescript
export const RATE_LIMITS = {
  api: { windowMs: 60_000, maxRequests: 100 },
  upload: { windowMs: 3_600_000, maxRequests: 10 },
  auth: { windowMs: 60_000, maxRequests: 5 },
  passkeyReg: { windowMs: 3_600_000, maxRequests: 5 },
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/lib/rate-limit.ts
git commit -m "add passkey registration rate limit config"
```

---

## Chunk 2: Server-Side Passkey Logic + Tests

### Task 5: Create Passkey Helper Library

**Files:**
- Create: `packages/api/src/lib/passkey.ts`

- [ ] **Step 1: Create the passkey helper module**

Create `packages/api/src/lib/passkey.ts`:

```typescript
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/types";
import type { PrismaClient } from "@ironpulse/db";
import crypto from "crypto";

const RP_NAME = "IronPulse";

function getRpId(): string {
  return process.env.WEBAUTHN_RP_ID ?? "localhost";
}

function getOrigin(): string {
  return process.env.WEBAUTHN_RP_ORIGIN ?? "http://localhost:3000";
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PASSKEYS = 5;

/** Clean up expired challenges probabilistically (every ~10th call) */
async function maybeCleanupChallenges(db: PrismaClient): Promise<void> {
  if (Math.random() < 0.1) {
    await db.passkeyChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export async function createRegistrationOptions(
  db: PrismaClient,
  userId: string,
  userEmail: string,
  userName: string,
) {
  const existingPasskeys = await db.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  if (existingPasskeys.length >= MAX_PASSKEYS) {
    throw new Error("Maximum passkey limit reached (5)");
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await db.passkeyChallenge.create({
    data: {
      challenge: options.challenge,
      userId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  await maybeCleanupChallenges(db);

  return options;
}

export async function verifyAndSaveRegistration(
  db: PrismaClient,
  userId: string,
  attestation: RegistrationResponseJSON,
  name?: string,
) {
  return await db.$transaction(async (tx) => {
    // Find and validate challenge
    const challengeRecord = await tx.passkeyChallenge.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challengeRecord) {
      throw new Error("No valid challenge found");
    }

    // Enforce passkey limit with FOR UPDATE lock to prevent concurrent over-registration
    const [{ count }] = await tx.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM passkeys WHERE user_id = ${userId}::uuid FOR UPDATE
    `;
    if (Number(count) >= MAX_PASSKEYS) {
      throw new Error("Maximum passkey limit reached (5)");
    }

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration verification failed");
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const passkey = await tx.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports ?? [],
        name: name ?? null,
      },
    });

    // Delete used challenge
    await tx.passkeyChallenge.delete({ where: { id: challengeRecord.id } });

    return passkey;
  });
}

export async function createLoginOptions(db: PrismaClient) {
  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "preferred",
    // No allowCredentials — discoverable credential flow
  });

  await db.passkeyChallenge.create({
    data: {
      challenge: options.challenge,
      userId: null, // login challenges are not user-bound
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  await maybeCleanupChallenges(db);

  return options;
}

export async function verifyLogin(
  db: PrismaClient,
  assertion: AuthenticationResponseJSON,
  challenge?: string,
) {
  const passkey = await db.passkey.findUnique({
    where: { credentialId: assertion.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          subscriptionStatus: true,
          unitSystem: true,
          onboardingComplete: true,
        },
      },
    },
  });

  if (!passkey) {
    throw new Error("Passkey not found");
  }

  // Look up challenge by exact value (passed from loginOptions → client → loginVerify)
  // This avoids ambiguous lookup when multiple login challenges exist concurrently
  let challengeRecord;
  if (challenge) {
    challengeRecord = await db.passkeyChallenge.findUnique({
      where: { challenge },
    });
  } else {
    // Fallback for re-auth flows (removePassword) where challenge isn't tracked client-side
    challengeRecord = await db.passkeyChallenge.findFirst({
      where: { userId: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!challengeRecord || challengeRecord.expiresAt < new Date()) {
    throw new Error("No valid challenge found");
  }

  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    credential: {
      id: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: Number(passkey.counter),
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) {
    throw new Error("Authentication verification failed");
  }

  // Update counter and last used
  await db.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  // Delete used challenge
  await db.passkeyChallenge.delete({ where: { id: challengeRecord.id } });

  // Generate a short-lived passkey login token (HMAC-signed)
  const passkeyLoginToken = signPasskeyLoginToken(passkey.user.id);

  return { user: passkey.user, passkeyLoginToken };
}

/** Sign a short-lived token for bridging passkey verification → NextAuth session */
export function signPasskeyLoginToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");

  const payload = JSON.stringify({ sub: userId, exp: Date.now() + 30_000 }); // 30s
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

/** Verify a passkey login token, return userId if valid */
export function verifyPasskeyLoginToken(token: string): string | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(Buffer.from(payloadB64, "base64url").toString())
      .digest("base64url");

    // Timing-safe comparison to prevent side-channel attacks
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp < Date.now()) return null;

    return payload.sub;
  } catch {
    return null; // Malformed token
  }
}

export async function hasAlternativeAuthMethod(
  db: PrismaClient,
  userId: string,
  excludePasskeyId?: string,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (user?.passwordHash) return true;

  const oauthAccount = await db.account.findFirst({
    where: { userId, provider: { notIn: ["email"] } },
  });

  if (oauthAccount) return true;

  const passkeyCount = await db.passkey.count({
    where: {
      userId,
      ...(excludePasskeyId ? { id: { not: excludePasskeyId } } : {}),
    },
  });

  return passkeyCount > 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/lib/passkey.ts
git commit -m "add WebAuthn passkey helper library"
```

### Task 6: Create Passkey tRPC Router

**Files:**
- Create: `packages/api/src/routers/passkey.ts`
- Modify: `packages/api/src/root.ts`

- [ ] **Step 1: Create the passkey router**

Create `packages/api/src/routers/passkey.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  passkeyRegisterVerifySchema,
  passkeyLoginVerifySchema,
  passkeyRenameSchema,
  passkeyDeleteSchema,
  removePasswordSchema,
} from "@ironpulse/shared";
import {
  createRegistrationOptions,
  verifyAndSaveRegistration,
  createLoginOptions,
  verifyLogin,
  hasAlternativeAuthMethod,
} from "../lib/passkey";
import { checkRateLimit, RATE_LIMITS } from "../lib/rate-limit";
import {
  createTRPCRouter,
  protectedProcedure,
  authRateLimitedProcedure,
} from "../trpc";

export const passkeyRouter = createTRPCRouter({
  registerOptions: protectedProcedure.mutation(async ({ ctx }) => {
    await checkRateLimit(
      `passkey-reg:${ctx.user.id}`,
      RATE_LIMITS.passkeyReg,
    );

    try {
      return await createRegistrationOptions(
        ctx.db,
        ctx.user.id,
        ctx.user.email,
        ctx.user.name,
      );
    } catch (err: any) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err.message ?? "Failed to generate registration options",
      });
    }
  }),

  registerVerify: protectedProcedure
    .input(passkeyRegisterVerifySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const passkey = await verifyAndSaveRegistration(
          ctx.db,
          ctx.user.id,
          input.attestation,
          input.name,
        );

        return {
          id: passkey.id,
          name: passkey.name,
          deviceType: passkey.deviceType,
          createdAt: passkey.createdAt,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err.message ?? "Registration verification failed",
        });
      }
    }),

  loginOptions: authRateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      return await createLoginOptions(ctx.db);
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate login options",
      });
    }
  }),

  loginVerify: authRateLimitedProcedure
    .input(passkeyLoginVerifySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { passkeyLoginToken } = await verifyLogin(
          ctx.db,
          input.assertion,
          input.challenge,
        );
        return { passkeyLoginToken };
      } catch (err: any) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Passkey authentication failed",
        });
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const passkeys = await ctx.db.passkey.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { passkeys };
  }),

  rename: protectedProcedure
    .input(passkeyRenameSchema)
    .mutation(async ({ ctx, input }) => {
      const passkey = await ctx.db.passkey.findFirst({
        where: { id: input.passkeyId, userId: ctx.user.id },
      });

      if (!passkey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found" });
      }

      await ctx.db.passkey.update({
        where: { id: input.passkeyId },
        data: { name: input.name },
      });

      return { ok: true };
    }),

  delete: protectedProcedure
    .input(passkeyDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      // Serializable transaction to prevent race condition with removePassword
      await ctx.db.$transaction(async (tx) => {
        const passkey = await tx.passkey.findFirst({
          where: { id: input.passkeyId, userId: ctx.user.id },
        });

        if (!passkey) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found" });
        }

        const hasAlternative = await hasAlternativeAuthMethod(
          tx as any,
          ctx.user.id,
          input.passkeyId,
        );

        if (!hasAlternative) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete your only authentication method. Add a password or link an OAuth provider first.",
          });
        }

        await tx.passkey.delete({ where: { id: input.passkeyId } });
      }, { isolationLevel: "Serializable" });

      return { ok: true };
    }),

  removePassword: protectedProcedure
    .input(removePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set on this account",
        });
      }

      // Re-authentication: must provide current password or passkey assertion
      if (input.currentPassword) {
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Incorrect password",
          });
        }
      } else if (input.passkeyAssertion) {
        // Verify a fresh passkey assertion
        try {
          await verifyLogin(ctx.db, input.passkeyAssertion);
        } catch {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Passkey verification failed",
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Re-authentication required: provide current password or passkey assertion",
        });
      }

      // Serializable transaction to prevent race condition with passkeyDelete
      await ctx.db.$transaction(async (tx) => {
        const passkeyCount = await tx.passkey.count({
          where: { userId: ctx.user.id },
        });

        const oauthAccount = await tx.account.findFirst({
          where: { userId: ctx.user.id, provider: { notIn: ["email"] } },
        });

        if (passkeyCount === 0 && !oauthAccount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove password without a passkey or OAuth provider linked",
          });
        }

        await tx.user.update({
          where: { id: ctx.user.id },
          data: { passwordHash: null },
        });
      }, { isolationLevel: "Serializable" });

      return { ok: true };
    }),
});
```

- [ ] **Step 2: Register passkey router in root.ts**

In `packages/api/src/root.ts`, add:

```typescript
import { passkeyRouter } from "./routers/passkey";
```

And add to the router object:

```typescript
passkey: passkeyRouter,
```

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/api exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/passkey.ts packages/api/src/root.ts
git commit -m "add passkey tRPC router with registration, login, CRUD, and password removal"
```

### Task 7: Write Passkey Router Tests

**Files:**
- Create: `packages/api/__tests__/passkey.test.ts`

- [ ] **Step 1: Write the test file**

Create `packages/api/__tests__/passkey.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import bcrypt from "bcryptjs";
import { createTRPCContext, createCallerFactory } from "../src/trpc";
import { passkeyRouter } from "../src/routers/passkey";
import { createTestUser } from "./helpers";

// Mock @simplewebauthn/server — we test our logic, not the WebAuthn library
vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: "test-challenge-registration",
    rp: { name: "IronPulse", id: "localhost" },
    user: { id: "dXNlci1pZA", name: "test@example.com", displayName: "Test" },
    pubKeyCredParams: [],
    timeout: 60000,
    attestation: "none",
  }),
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: "credential-id-123",
        publicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 0,
        transports: ["internal"],
      },
      credentialDeviceType: "multiDevice",
      credentialBackedUp: true,
    },
  }),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: "test-challenge-login",
    timeout: 60000,
    rpId: "localhost",
  }),
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 1,
    },
  }),
}));

const db = new PrismaClient();
const createCaller = createCallerFactory(passkeyRouter);

function passkeyCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.passkeyChallenge.deleteMany();
  await db.passkey.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
});

async function createDbUser(overrides?: { passwordHash?: string | null }) {
  const hash = overrides?.passwordHash !== undefined
    ? overrides.passwordHash
    : await bcrypt.hash("password123", 12);

  return db.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      passwordHash: hash,
      accounts: {
        create: {
          provider: "email",
          providerAccountId: "test@example.com",
        },
      },
    },
  });
}

describe("passkey.registerOptions", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = passkeyCaller();
    await expect(caller.registerOptions()).rejects.toThrow("UNAUTHORIZED");
  });

  it("returns registration options for authenticated user", async () => {
    const dbUser = await createDbUser();
    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    const options = await caller.registerOptions();
    expect(options.challenge).toBeDefined();
    expect(options.rp).toBeDefined();

    // Verify challenge was stored
    const challenges = await db.passkeyChallenge.findMany({
      where: { userId: dbUser.id },
    });
    expect(challenges).toHaveLength(1);
  });

  it("rejects when user has 5 passkeys", async () => {
    const dbUser = await createDbUser();

    // Create 5 passkeys
    for (let i = 0; i < 5; i++) {
      await db.passkey.create({
        data: {
          userId: dbUser.id,
          credentialId: `cred-${i}`,
          publicKey: Buffer.from([1, 2, 3]),
          counter: 0,
          deviceType: "multiDevice",
        },
      });
    }

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await expect(caller.registerOptions()).rejects.toThrow("Maximum passkey limit");
  });
});

describe("passkey.registerVerify", () => {
  it("creates a passkey after verification", async () => {
    const dbUser = await createDbUser();
    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    // First get registration options to create a challenge
    await caller.registerOptions();

    const result = await caller.registerVerify({
      attestation: { id: "cred-id", rawId: "cred-id", response: {}, type: "public-key" } as any,
      name: "My MacBook",
    });

    expect(result.name).toBe("My MacBook");
    expect(result.deviceType).toBe("multiDevice");

    // Verify passkey in DB
    const passkeys = await db.passkey.findMany({ where: { userId: dbUser.id } });
    expect(passkeys).toHaveLength(1);
    expect(passkeys[0].name).toBe("My MacBook");
  });
});

describe("passkey.list", () => {
  it("returns user passkeys", async () => {
    const dbUser = await createDbUser();

    await db.passkey.create({
      data: {
        userId: dbUser.id,
        credentialId: "cred-1",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "multiDevice",
        name: "MacBook Pro",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    const result = await caller.list();
    expect(result.passkeys).toHaveLength(1);
    expect(result.passkeys[0].name).toBe("MacBook Pro");
  });

  it("does not return other user's passkeys", async () => {
    const user1 = await createDbUser();
    const user2 = await db.user.create({
      data: {
        email: "other@example.com",
        name: "Other User",
      },
    });

    await db.passkey.create({
      data: {
        userId: user2.id,
        credentialId: "other-cred",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "singleDevice",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: user1.id, email: user1.email }),
    });

    const result = await caller.list();
    expect(result.passkeys).toHaveLength(0);
  });
});

describe("passkey.rename", () => {
  it("renames a passkey", async () => {
    const dbUser = await createDbUser();
    const passkey = await db.passkey.create({
      data: {
        userId: dbUser.id,
        credentialId: "cred-rename",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "multiDevice",
        name: "Old Name",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await caller.rename({ passkeyId: passkey.id, name: "New Name" });

    const updated = await db.passkey.findUnique({ where: { id: passkey.id } });
    expect(updated?.name).toBe("New Name");
  });

  it("rejects renaming another user's passkey", async () => {
    const user1 = await createDbUser();
    const user2 = await db.user.create({
      data: { email: "other@example.com", name: "Other" },
    });
    const passkey = await db.passkey.create({
      data: {
        userId: user2.id,
        credentialId: "other-cred",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "singleDevice",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: user1.id, email: user1.email }),
    });

    await expect(
      caller.rename({ passkeyId: passkey.id, name: "Hacked" }),
    ).rejects.toThrow("NOT_FOUND");
  });
});

describe("passkey.delete", () => {
  it("deletes a passkey when user has password as fallback", async () => {
    const dbUser = await createDbUser(); // has password
    const passkey = await db.passkey.create({
      data: {
        userId: dbUser.id,
        credentialId: "cred-delete",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "multiDevice",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await caller.delete({ passkeyId: passkey.id });

    const remaining = await db.passkey.findMany({ where: { userId: dbUser.id } });
    expect(remaining).toHaveLength(0);
  });

  it("rejects deleting last passkey when no password or OAuth", async () => {
    const dbUser = await createDbUser({ passwordHash: null });

    // Remove the email account so no OAuth exists
    await db.account.deleteMany({ where: { userId: dbUser.id } });

    const passkey = await db.passkey.create({
      data: {
        userId: dbUser.id,
        credentialId: "cred-only",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "multiDevice",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await expect(
      caller.delete({ passkeyId: passkey.id }),
    ).rejects.toThrow("Cannot delete your only authentication method");
  });
});

describe("passkey.removePassword", () => {
  it("removes password when user has passkey and provides current password", async () => {
    const dbUser = await createDbUser();
    await db.passkey.create({
      data: {
        userId: dbUser.id,
        credentialId: "cred-pw-removal",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "multiDevice",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await caller.removePassword({ currentPassword: "password123" });

    const updated = await db.user.findUnique({ where: { id: dbUser.id } });
    expect(updated?.passwordHash).toBeNull();
  });

  it("rejects removal with wrong password", async () => {
    const dbUser = await createDbUser();
    await db.passkey.create({
      data: {
        userId: dbUser.id,
        credentialId: "cred-pw-wrong",
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0,
        deviceType: "multiDevice",
      },
    });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await expect(
      caller.removePassword({ currentPassword: "wrongpassword" }),
    ).rejects.toThrow("Incorrect password");
  });

  it("rejects removal without re-authentication", async () => {
    const dbUser = await createDbUser();
    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await expect(caller.removePassword({})).rejects.toThrow(
      "Re-authentication required",
    );
  });

  it("rejects removal when no alternative auth method", async () => {
    const dbUser = await createDbUser();
    // Has password but no passkeys and only email account (not OAuth)
    await db.account.deleteMany({ where: { userId: dbUser.id } });

    const caller = passkeyCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await expect(
      caller.removePassword({ currentPassword: "password123" }),
    ).rejects.toThrow("Cannot remove password without a passkey or OAuth");
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/api test -- passkey
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/api/__tests__/passkey.test.ts
git commit -m "add passkey router integration tests"
```

---

## Chunk 3: NextAuth Passkey Credentials Provider

### Task 8: Add Passkey Credentials Provider to NextAuth

**Files:**
- Modify: `apps/web/src/lib/auth.ts`

- [ ] **Step 1: Add the passkey Credentials provider**

In `apps/web/src/lib/auth.ts`, add a second Credentials provider for passkey login. Import the token verifier:

```typescript
import { verifyPasskeyLoginToken } from "@ironpulse/api/src/lib/passkey";
```

Add after the existing `Credentials({...})` provider in the `providers` array:

```typescript
Credentials({
  id: "passkey",
  name: "Passkey",
  credentials: {
    passkeyLoginToken: {},
  },
  async authorize(credentials) {
    const token = credentials?.passkeyLoginToken as string;
    if (!token) return null;

    const userId = verifyPasskeyLoginToken(token);
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      subscriptionStatus: user.subscriptionStatus,
      unitSystem: user.unitSystem,
      onboardingComplete: user.onboardingComplete,
    };
  },
}),
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm --filter @ironpulse/web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/auth.ts
git commit -m "add passkey Credentials provider to NextAuth for session bridging"
```

---

## Chunk 4: Web UI

### Task 9: Create Client-Side Passkey Helpers

**Files:**
- Create: `apps/web/src/lib/passkey.ts`

- [ ] **Step 1: Create the browser-side passkey helper**

Create `apps/web/src/lib/passkey.ts`:

```typescript
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

export async function registerPasskey(
  options: PublicKeyCredentialCreationOptionsJSON,
) {
  return startRegistration({ optionsJSON: options });
}

export async function authenticatePasskey(
  options: PublicKeyCredentialRequestOptionsJSON,
) {
  return startAuthentication({ optionsJSON: options });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/passkey.ts
git commit -m "add client-side WebAuthn passkey helpers"
```

### Task 10: Add Passkey Login Button

**Files:**
- Create: `apps/web/src/components/passkey-login-button.tsx`
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create the passkey login button component**

Create `apps/web/src/components/passkey-login-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { authenticatePasskey } from "@/lib/passkey";

export function PasskeyLoginButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginOptions = trpc.passkey.loginOptions.useMutation();
  const loginVerify = trpc.passkey.loginVerify.useMutation();

  async function handlePasskeyLogin() {
    setError(null);
    setLoading(true);

    try {
      // Step 1: Get challenge from server
      const options = await loginOptions.mutateAsync();

      // Step 2: Trigger browser passkey dialog
      const assertion = await authenticatePasskey(options);

      // Step 3: Verify with server, get login token (pass challenge for exact lookup)
      const { passkeyLoginToken } = await loginVerify.mutateAsync({
        assertion,
        challenge: options.challenge,
      });

      // Step 4: Bridge to NextAuth session
      const result = await signIn("passkey", {
        passkeyLoginToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to create session");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      // User cancelled the dialog or verification failed
      if (err?.name === "NotAllowedError") {
        // User cancelled — do nothing
      } else {
        setError("Passkey authentication failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={handlePasskeyLogin}
        disabled={loading}
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {loading ? "Verifying..." : "Sign in with passkey"}
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </>
  );
}
```

- [ ] **Step 2: Add the button to the login page**

In `apps/web/src/app/(auth)/login/page.tsx`, import the component:

```typescript
import { PasskeyLoginButton } from "@/components/passkey-login-button";
```

Add it in the OAuth section (after the "or continue with" divider, before the Google button). Insert as the first child in the `<div className="space-y-2">` block:

```tsx
<PasskeyLoginButton />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/passkey-login-button.tsx apps/web/src/app/(auth)/login/page.tsx
git commit -m "add passkey login button to web login page"
```

### Task 11: Create Security Settings Page

**Files:**
- Create: `apps/web/src/app/(app)/profile/security/page.tsx`
- Modify: `apps/web/src/app/(app)/profile/page.tsx`

- [ ] **Step 1: Create the security settings page**

Create `apps/web/src/app/(app)/profile/security/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Fingerprint,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { registerPasskey, authenticatePasskey } from "@/lib/passkey";

export default function SecurityPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.passkey.list.useQuery();
  const { data: userData } = trpc.user.me.useQuery();
  const registerOptions = trpc.passkey.registerOptions.useMutation();
  const registerVerify = trpc.passkey.registerVerify.useMutation();
  const loginOptions = trpc.passkey.loginOptions.useMutation();
  const renameMutation = trpc.passkey.rename.useMutation({
    onSuccess: () => utils.passkey.list.invalidate(),
  });
  const deleteMutation = trpc.passkey.delete.useMutation({
    onSuccess: () => utils.passkey.list.invalidate(),
  });
  const removePasswordMutation = trpc.passkey.removePassword.useMutation();

  const [addingPasskey, setAddingPasskey] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordRemovalPassword, setPasswordRemovalPassword] = useState("");
  const [showPasswordRemoval, setShowPasswordRemoval] = useState(false);
  const [reAuthMethod, setReAuthMethod] = useState<"password" | "passkey">("password");

  async function handleAddPasskey() {
    setError(null);
    setAddingPasskey(true);
    try {
      const options = await registerOptions.mutateAsync();
      const attestation = await registerPasskey(options);
      const name = prompt("Name this passkey (optional):", "") ?? undefined;
      await registerVerify.mutateAsync({
        attestation,
        name: name || undefined,
      });
      utils.passkey.list.invalidate();
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setError(err?.message ?? "Failed to register passkey");
      }
    } finally {
      setAddingPasskey(false);
    }
  }

  function handleStartRename(id: string, currentName: string | null) {
    setEditingId(id);
    setEditName(currentName ?? "");
  }

  function handleSaveRename(id: string) {
    renameMutation.mutate({ passkeyId: id, name: editName });
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this passkey? This cannot be undone.")) {
      deleteMutation.mutate(
        { passkeyId: id },
        { onError: (err) => setError(err.message) },
      );
    }
  }

  async function handleRemovePassword() {
    setError(null);
    try {
      if (reAuthMethod === "passkey") {
        // Re-authenticate via passkey assertion
        const options = await loginOptions.mutateAsync();
        const assertion = await authenticatePasskey(options);
        await removePasswordMutation.mutateAsync({ passkeyAssertion: assertion });
      } else {
        await removePasswordMutation.mutateAsync({
          currentPassword: passwordRemovalPassword,
        });
      }
      setShowPasswordRemoval(false);
      setPasswordRemovalPassword("");
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setError(err?.message ?? "Failed to remove password");
      }
    }
  }

  const passkeys = data?.passkeys ?? [];
  const atLimit = passkeys.length >= 5;
  // Can remove password if user has at least one passkey OR an OAuth provider
  const hasOAuth = (userData?.user as any)?.accounts?.some(
    (a: any) => a.provider !== "email",
  );
  const canRemovePassword = passkeys.length > 0 || hasOAuth;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-[200px] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Security</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Passkeys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No passkeys registered. Add one to sign in without a password.
            </p>
          ) : (
            passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex-1">
                  {editingId === pk.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 w-48"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveRename(pk.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium">
                        {pk.name ?? "Unnamed passkey"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pk.deviceType === "multiDevice"
                          ? "Synced"
                          : "Single device"}{" "}
                        &middot; Added{" "}
                        {new Date(pk.createdAt).toLocaleDateString()}
                        {pk.lastUsedAt &&
                          ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </>
                  )}
                </div>
                {editingId !== pk.id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartRename(pk.id, pk.name)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(pk.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddPasskey}
            disabled={addingPasskey || atLimit}
          >
            <Plus className="h-4 w-4" />
            {atLimit
              ? "Maximum passkeys reached (5)"
              : addingPasskey
                ? "Registering..."
                : "Add passkey"}
          </Button>
        </CardContent>
      </Card>

      {/* Password Removal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showPasswordRemoval ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Make sure you have access to your passkey device. If you lose it
                and have no OAuth provider linked, you&apos;ll be locked out.
              </p>
              <div className="flex gap-2 mb-2">
                <Button
                  variant={reAuthMethod === "password" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReAuthMethod("password")}
                >
                  Confirm with password
                </Button>
                {passkeys.length > 0 && (
                  <Button
                    variant={reAuthMethod === "passkey" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReAuthMethod("passkey")}
                  >
                    Confirm with passkey
                  </Button>
                )}
              </div>
              {reAuthMethod === "password" && (
                <Input
                  type="password"
                  placeholder="Enter current password to confirm"
                  value={passwordRemovalPassword}
                  onChange={(e) => setPasswordRemovalPassword(e.target.value)}
                />
              )}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemovePassword}
                  disabled={
                    (reAuthMethod === "password" && !passwordRemovalPassword) ||
                    removePasswordMutation.isPending
                  }
                >
                  {removePasswordMutation.isPending
                    ? "Removing..."
                    : reAuthMethod === "passkey"
                      ? "Verify passkey & remove"
                      : "Remove password"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPasswordRemoval(false);
                    setPasswordRemovalPassword("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowPasswordRemoval(true)}
              disabled={!canRemovePassword}
            >
              Remove password (go passwordless)
            </Button>
          )}
          {!canRemovePassword && (
            <p className="mt-2 text-xs text-muted-foreground">
              Register a passkey or link an OAuth provider before removing your password.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add security link to profile page**

In `apps/web/src/app/(app)/profile/page.tsx`, import `Shield`:

```typescript
import { User, Settings, LogOut, Check, Link2, Users, Download, Shield } from "lucide-react";
```

Add a new card before the "Connected Apps" card (before `{/* Connected Apps */}`):

```tsx
{/* Security */}
<Card>
  <CardContent className="pt-6">
    <Button variant="outline" className="w-full" asChild>
      <Link href="/profile/security">
        <Shield className="h-4 w-4" />
        Security (Passkeys & Password)
      </Link>
    </Button>
  </CardContent>
</Card>
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm --filter @ironpulse/web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/profile/security/page.tsx apps/web/src/app/(app)/profile/page.tsx
git commit -m "add web security settings page with passkey management"
```

---

## Chunk 5: Mobile Biometric Unlock

### Task 12: Create Biometric Helper Library

**Files:**
- Create: `apps/mobile/lib/biometric.ts`

- [ ] **Step 1: Create the biometric helper module**

Create `apps/mobile/lib/biometric.ts`:

```typescript
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "biometric-enabled";

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function getBiometricLabel(): Promise<string> {
  const types =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (
    types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    )
  ) {
    return "Face ID";
  }
  if (
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  ) {
    return "Touch ID";
  }
  return "Biometric";
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === "true";
}

export async function enableBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Verify to enable biometric unlock",
    fallbackLabel: "Use Passcode",
  });

  if (result.success) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    return true;
  }

  return false;
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock IronPulse",
    fallbackLabel: "Use Passcode",
    cancelLabel: "Sign In Instead",
  });

  return result.success;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/biometric.ts
git commit -m "add mobile biometric helper library"
```

### Task 13: Create Post-Login Biometric Enrollment Prompt

**Files:**
- Create: `apps/mobile/components/biometric-prompt.tsx`

- [ ] **Step 1: Create the biometric enrollment prompt component**

Create `apps/mobile/components/biometric-prompt.tsx`:

```tsx
import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Fingerprint } from "lucide-react-native";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  getBiometricLabel,
} from "@/lib/biometric";

/** Shows a one-time prompt after login to enable biometric unlock. */
export function BiometricEnrollmentPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [bioLabel, setBioLabel] = useState("Biometric");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function check() {
      const available = await isBiometricAvailable();
      const alreadyEnabled = await isBiometricEnabled();
      if (available && !alreadyEnabled) {
        const label = await getBiometricLabel();
        setBioLabel(label);
        setVisible(true);
      }
    }
    check();
  }, []);

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "hsl(217, 33%, 17%)",
        padding: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Fingerprint size={24} color="hsl(213, 31%, 91%)" />
        <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16, fontWeight: "600", flex: 1 }}>
          Enable {bioLabel} for quick unlock?
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <Pressable
          onPress={async () => {
            await enableBiometric();
            setVisible(false);
            onDismiss();
          }}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: "hsl(210, 40%, 98%)",
          }}
        >
          <Text style={{ fontWeight: "600", color: "hsl(222.2, 47.4%, 11.2%)" }}>
            Enable
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { setVisible(false); onDismiss(); }}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: "hsl(216, 34%, 17%)",
            borderWidth: 1,
            borderColor: "hsl(215, 20%, 65%)",
          }}
        >
          <Text style={{ color: "hsl(215, 20%, 65%)" }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/biometric-prompt.tsx
git commit -m "add post-login biometric enrollment prompt"
```

### Task 14: Integrate Biometric Gate into Auth Flow

**Files:**
- Modify: `apps/mobile/lib/auth.tsx`

- [ ] **Step 1: Add biometric unlock to AuthProvider restore flow**

In `apps/mobile/lib/auth.tsx`, add imports:

```typescript
import { isBiometricEnabled, isBiometricAvailable, authenticateWithBiometric, disableBiometric } from "./biometric";
```

Modify the `restore()` function in the useEffect to check biometric before restoring session:

```typescript
useEffect(() => {
  async function restore() {
    try {
      const storedToken = await SecureStore.getItemAsync("auth-token");
      const storedUser = await SecureStore.getItemAsync("auth-user");

      if (storedToken && storedUser) {
        // Check if biometric unlock is required
        const bioEnabled = await isBiometricEnabled();
        const bioAvailable = await isBiometricAvailable();

        if (bioEnabled && bioAvailable) {
          const success = await authenticateWithBiometric();

          if (!success) {
            // Biometric + passcode both failed — don't restore session, show login
            setIsLoading(false);
            return;
          }
        } else if (bioEnabled && !bioAvailable) {
          // User disabled biometrics in OS settings — skip gate, session still valid
        }

        const parsedUser = JSON.parse(storedUser) as SessionUser;
        setToken(storedToken);
        setUser(parsedUser);

        try {
          await trpc.auth.getSession.query();
        } catch {
          // Token expired or network unavailable — use stored user optimistically
        }
      }
    } catch {
      // Secure store read failed
    } finally {
      setIsLoading(false);
    }
  }
  restore();
}, []);
```

Update the `signOut` callback to also clear biometric flag:

```typescript
const signOut = useCallback(async () => {
  await disableBiometric();
  await SecureStore.deleteItemAsync("auth-token");
  await SecureStore.deleteItemAsync("auth-user");
  setToken(null);
  setUser(null);
}, []);
```

- [ ] **Step 2: Show biometric enrollment prompt after fresh login**

After the `signIn` callback resolves successfully, show the enrollment prompt. Add to AuthContextValue interface:

```typescript
showBiometricPrompt: boolean;
dismissBiometricPrompt: () => void;
```

Add state:

```typescript
const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
```

In the `signIn` callback, after `setUser(result.user)`, trigger the prompt:

```typescript
// Check if we should offer biometric enrollment
const bioAvailable = await isBiometricAvailable();
const bioEnabled = await isBiometricEnabled();
if (bioAvailable && !bioEnabled) {
  setShowBiometricPrompt(true);
}
```

Add dismiss handler:

```typescript
const dismissBiometricPrompt = useCallback(() => {
  setShowBiometricPrompt(false);
}, []);
```

Pass both through the context provider value. The `BiometricEnrollmentPrompt` component from Task 13 can be rendered in the root layout when `showBiometricPrompt` is true.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/auth.tsx
git commit -m "integrate biometric unlock into mobile auth restore flow"
```

### Task 15: Add Biometric Toggle to Mobile Profile

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Add biometric security section to profile**

In `apps/mobile/app/(tabs)/profile.tsx`, add imports:

```typescript
import { useState, useEffect } from "react";
import { Switch } from "react-native";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricLabel,
} from "@/lib/biometric";
```

Add state and effect inside the `ProfileScreen` component:

```typescript
const [bioAvailable, setBioAvailable] = useState(false);
const [bioEnabled, setBioEnabled] = useState(false);
const [bioLabel, setBioLabel] = useState("Biometric");
const [bioLoading, setBioLoading] = useState(false);

useEffect(() => {
  async function checkBiometric() {
    const available = await isBiometricAvailable();
    setBioAvailable(available);
    if (available) {
      const enabled = await isBiometricEnabled();
      setBioEnabled(enabled);
      const label = await getBiometricLabel();
      setBioLabel(label);
    }
  }
  checkBiometric();
}, []);

async function handleBiometricToggle(value: boolean) {
  setBioLoading(true);
  if (value) {
    const success = await enableBiometric();
    setBioEnabled(success);
  } else {
    await disableBiometric();
    setBioEnabled(false);
  }
  setBioLoading(false);
}
```

Add a security card in the profile JSX, before the Export Data card:

```tsx
{bioAvailable && (
  <Card style={{ marginBottom: 16, gap: 8 }}>
    <Text
      style={{
        fontSize: 10,
        color: "hsl(215, 20%, 65%)",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      Security
    </Text>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>
        {bioLabel} Unlock
      </Text>
      <Switch
        value={bioEnabled}
        onValueChange={handleBiometricToggle}
        disabled={bioLoading}
        trackColor={{ false: "hsl(216, 34%, 17%)", true: "hsl(142, 71%, 45%)" }}
      />
    </View>
  </Card>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/profile.tsx
git commit -m "add biometric unlock toggle to mobile profile screen"
```

---

## Chunk 6: Verification

### Task 16: Type-Check All Packages

- [ ] **Step 1: Type-check shared**

```bash
pnpm --filter @ironpulse/shared exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Type-check API**

```bash
pnpm --filter @ironpulse/api exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Type-check web**

```bash
pnpm --filter @ironpulse/web exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run passkey tests**

```bash
pnpm --filter @ironpulse/api test -- passkey
```

Expected: All tests pass.

- [ ] **Step 5: Run all API tests**

```bash
pnpm --filter @ironpulse/api test
```

Expected: All tests pass (no regressions).

- [ ] **Step 6: Build web app**

```bash
pnpm --filter @ironpulse/web build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix issues found during passkey/biometric verification"
```

(Only run if fixes were needed.)
