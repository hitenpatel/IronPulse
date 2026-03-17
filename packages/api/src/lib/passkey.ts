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

    // Enforce passkey limit — lock existing rows to prevent concurrent over-registration
    const existingRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM passkeys WHERE user_id = ${userId}::uuid FOR UPDATE
    `;
    if (existingRows.length >= MAX_PASSKEYS) {
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
