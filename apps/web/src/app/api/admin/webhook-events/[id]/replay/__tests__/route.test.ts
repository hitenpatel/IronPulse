import { describe, expect, it, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));
vi.mock("@zor/db", () => ({ db }));

import { POST } from "../route";

const SECRET = "test-cron-secret";

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  db.$queryRaw.mockReset();
});

function req(headers: Record<string, string> = {}) {
  return new Request("https://x/api/admin/webhook-events/evt_1/replay", {
    method: "POST",
    headers,
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/admin/webhook-events/[id]/replay", () => {
  it("401 without bearer", async () => {
    const r = await POST(req(), params("evt_1"));
    expect(r.status).toBe(401);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("404 for missing id", async () => {
    db.$queryRaw.mockResolvedValue([]);
    const r = await POST(
      req({ Authorization: `Bearer ${SECRET}` }),
      params("does-not-exist"),
    );
    expect(r.status).toBe(404);
  });

  it("404 for a succeeded row (not eligible for replay)", async () => {
    db.$queryRaw.mockResolvedValue([]);
    const r = await POST(
      req({ Authorization: `Bearer ${SECRET}` }),
      params("evt_succeeded"),
    );
    expect(r.status).toBe(404);
  });

  it("200 for a dlq row: resets to pending, attempts=0, lastError=null", async () => {
    db.$queryRaw.mockResolvedValue([
      {
        id: "evt_dlq",
        provider: "strava",
        externalId: "ext_1",
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date("2026-09-06T00:00:00Z"),
        lastError: null,
        receivedAt: new Date("2026-09-05T00:00:00Z"),
      },
    ]);
    const r = await POST(
      req({ Authorization: `Bearer ${SECRET}` }),
      params("evt_dlq"),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.item).toMatchObject({
      id: "evt_dlq",
      status: "pending",
      attempts: 0,
      lastError: null,
    });
  });

  it("200 for a skipped_no_connection row: same reset shape", async () => {
    db.$queryRaw.mockResolvedValue([
      {
        id: "evt_skipped",
        provider: "garmin",
        externalId: "ext_2",
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date("2026-09-06T00:00:00Z"),
        lastError: null,
        receivedAt: new Date("2026-09-05T00:00:00Z"),
      },
    ]);
    const r = await POST(
      req({ Authorization: `Bearer ${SECRET}` }),
      params("evt_skipped"),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.item).toMatchObject({
      id: "evt_skipped",
      status: "pending",
      attempts: 0,
      lastError: null,
    });
  });
});
