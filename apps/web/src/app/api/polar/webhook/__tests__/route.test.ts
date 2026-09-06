import { describe, expect, it, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  deviceConnection: {
    findFirst: vi.fn(),
  },
  webhookEvent: {
    create: vi.fn(),
  },
}));
vi.mock("@zor/db", async () => {
  const actual = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");
  return { ...actual, db };
});

import { POST } from "../route";

function postReq(body: unknown) {
  return new Request("https://example/api/polar/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  event: "EXERCISE",
  user_id: "99",
  entity_id: "entity_id-value",
  timestamp: "2026-09-06T00:00:00Z",
  url: "https://polaraccesslink.com/v3/exercises/entity_id-value",
};

beforeEach(() => {
  db.deviceConnection.findFirst.mockReset();
  db.webhookEvent.create.mockReset();
  db.deviceConnection.findFirst.mockResolvedValue(null);
  db.webhookEvent.create.mockResolvedValue({});
});

describe("POST /api/polar/webhook", () => {
  it("EXERCISE with matching connection → 200; inserts row with userId set and externalId=entity_id", async () => {
    db.deviceConnection.findFirst.mockResolvedValue({ userId: "user-123" });

    const res = await POST(postReq(validPayload) as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(1);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "polar",
        externalId: "entity_id-value",
        payload: validPayload,
        userId: "user-123",
        status: "pending",
        nextAttemptAt: expect.any(Date),
      }),
    });
    expect(db.deviceConnection.findFirst).toHaveBeenCalledWith({
      where: { provider: "polar", providerAccountId: "99" },
      select: { userId: true },
    });
  });

  it("valid payload with no matching connection → userId is null", async () => {
    db.deviceConnection.findFirst.mockResolvedValue(null);

    const res = await POST(postReq(validPayload) as never);

    expect(res.status).toBe(200);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it("event=PING → 200, zero rows inserted", async () => {
    const res = await POST(postReq({ ...validPayload, event: "PING" }) as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("missing entity_id → 400, zero rows inserted", async () => {
    const { entity_id: _entity_id, ...rest } = validPayload;
    const res = await POST(postReq(rest) as never);

    expect(res.status).toBe(400);
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
    expect(db.deviceConnection.findFirst).not.toHaveBeenCalled();
  });

  it("non-P2002 DB throw → 500", async () => {
    db.webhookEvent.create.mockRejectedValue(new Error("connection refused"));

    const res = await POST(postReq(validPayload) as never);

    expect(res.status).toBe(500);
  });

  it("duplicate delivery: two identical POSTs both 200, second is idempotent via P2002", async () => {
    db.webhookEvent.create.mockResolvedValueOnce({});
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["provider_external_id_unique"] },
    });
    db.webhookEvent.create.mockRejectedValueOnce(p2002);

    const res1 = await POST(postReq(validPayload) as never);
    const res2 = await POST(postReq(validPayload) as never);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(2);
  });
});
