import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@ironpulse/db";

// CI smoke test: confirms PostgreSQL is reachable and responsive before the
// full integration suite runs. This test fails when the DB service is not yet
// ready (e.g. Forgejo act_runner starts job steps before container health
// checks pass). Skipped locally when DATABASE_URL is not configured.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDatabase)("database connectivity", () => {
  const db = new PrismaClient();

  beforeAll(async () => {
    await db.$connect();
  }, 30_000);

  afterAll(async () => {
    await db.$disconnect();
  });

  it("can execute a basic query against the test database", async () => {
    const result =
      await db.$queryRaw<[{ ok: bigint }]>`SELECT 1 AS ok`;
    expect(Number(result[0].ok)).toBe(1);
  });
});
