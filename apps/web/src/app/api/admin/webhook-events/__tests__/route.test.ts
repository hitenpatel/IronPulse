import { describe, expect, it, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  webhookEvent: {
    findMany: vi.fn(),
  },
}));
vi.mock("@zor/db", async () => {
  const actual = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");
  return { ...actual, db };
});

import { GET } from "../route";

const SECRET = "test-cron-secret";

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  db.webhookEvent.findMany.mockReset();
});

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: "GET", headers });
}

describe("GET /api/admin/webhook-events", () => {
  it("401 without bearer", async () => {
    const r = await GET(req("https://x/api/admin/webhook-events"));
    expect(r.status).toBe(401);
    expect(db.webhookEvent.findMany).not.toHaveBeenCalled();
  });

  it("400 for status=nonsense", async () => {
    const r = await GET(
      req("https://x/api/admin/webhook-events?status=nonsense", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r.status).toBe(400);
  });

  it("400 for limit=abc", async () => {
    const r = await GET(
      req("https://x/api/admin/webhook-events?limit=abc", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r.status).toBe(400);
  });

  it("400 for limit=0", async () => {
    const r = await GET(
      req("https://x/api/admin/webhook-events?limit=0", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r.status).toBe(400);
  });

  it("400 for limit=201", async () => {
    const r = await GET(
      req("https://x/api/admin/webhook-events?limit=201", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r.status).toBe(400);
  });

  it("400 for a malformed cursor", async () => {
    const r = await GET(
      req("https://x/api/admin/webhook-events?cursor=short", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r.status).toBe(400);
    expect(db.webhookEvent.findMany).not.toHaveBeenCalled();
  });

  it("200 with default status=dlq, limit=50", async () => {
    db.webhookEvent.findMany.mockResolvedValue([
      { id: "evt_1", status: "dlq" },
    ]);
    const r = await GET(
      req("https://x/api/admin/webhook-events", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r.status).toBe(200);
    expect(db.webhookEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "dlq" },
        take: 51,
      }),
    );
    const body = await r.json();
    expect(body).toEqual({ items: [{ id: "evt_1", status: "dlq" }], nextCursor: null });
  });

  it("cursor pagination round-trip: emits nextCursor when more rows exist, and accepts it back", async () => {
    const rows = Array.from({ length: 51 }, (_, i) => ({
      id: `cljabcdefghijklmnopqr${String(i).padStart(2, "0")}`,
      status: "dlq",
    }));
    db.webhookEvent.findMany.mockResolvedValueOnce(rows);
    const r1 = await GET(
      req("https://x/api/admin/webhook-events", {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r1.status).toBe(200);
    const body1 = await r1.json();
    expect(body1.items).toHaveLength(50);
    expect(body1.nextCursor).toBe(rows[49].id);

    db.webhookEvent.findMany.mockResolvedValueOnce([]);
    const r2 = await GET(
      req(`https://x/api/admin/webhook-events?cursor=${body1.nextCursor}`, {
        Authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(r2.status).toBe(200);
    expect(db.webhookEvent.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: body1.nextCursor },
      }),
    );
    const body2 = await r2.json();
    expect(body2).toEqual({ items: [], nextCursor: null });
  });
});
