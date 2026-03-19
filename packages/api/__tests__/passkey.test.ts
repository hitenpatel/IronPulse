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
    ).rejects.toThrow("Passkey not found");
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
