import { type PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc";
import { createTRPCRouter } from "../src/trpc";
import type { SessionUser } from "@ironpulse/shared";

// Uses a real DB — DATABASE_URL must point to a test database.
// Callers are responsible for cleanup.

export function createTestContext(
  db: PrismaClient,
  session: { user: SessionUser } | null = null
) {
  return createTRPCContext({ db, session });
}

export function createTestUser(overrides?: Partial<SessionUser>): SessionUser {
  return {
    id: crypto.randomUUID(),
    email: "test@example.com",
    name: "Test User",
    tier: "athlete",
    subscriptionStatus: "none",
    unitSystem: "metric",
    ...overrides,
  };
}
