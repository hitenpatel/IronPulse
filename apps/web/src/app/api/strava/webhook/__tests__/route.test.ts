import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

import { GET, POST } from "../route";

function postReq(body: unknown) {
  return new Request("https://example/api/strava/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(params: Record<string, string>) {
  const url = new URL("https://example/api/strava/webhook");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: "GET" });
}

const validPayload = {
  object_type: "activity",
  aspect_type: "create",
  object_id: 42,
  owner_id: 99,
};

beforeEach(() => {
  db.deviceConnection.findFirst.mockReset();
  db.webhookEvent.create.mockReset();
  db.deviceConnection.findFirst.mockResolvedValue(null);
  db.webhookEvent.create.mockResolvedValue({});
});

describe("POST /api/strava/webhook", () => {
  it("valid activity/create payload → 200; inserts one row with correct fields, userId from matching connection", async () => {
    db.deviceConnection.findFirst.mockResolvedValue({ userId: "user-123" });

    const res = await POST(postReq(validPayload) as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(1);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "strava",
        externalId: "42",
        payload: validPayload,
        userId: "user-123",
        status: "pending",
        nextAttemptAt: expect.any(Date),
      }),
    });
    expect(db.deviceConnection.findFirst).toHaveBeenCalledWith({
      where: { provider: "strava", providerAccountId: "99" },
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

  it("aspect_type=update → 200, zero rows inserted", async () => {
    const res = await POST(
      postReq({ ...validPayload, aspect_type: "update" }) as never,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("object_type=athlete → 200, zero rows inserted", async () => {
    const res = await POST(
      postReq({ ...validPayload, object_type: "athlete" }) as never,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("missing owner_id → 400, zero rows inserted", async () => {
    const { owner_id: _owner_id, ...rest } = validPayload;
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

describe("GET /api/strava/webhook", () => {
  const TOKEN = "test-verify-token";

  beforeEach(() => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", TOKEN);
  });

  it("valid hub.verify_token → returns challenge", async () => {
    const res = await GET(
      getReq({
        "hub.mode": "subscribe",
        "hub.challenge": "abc123",
        "hub.verify_token": TOKEN,
      }) as never,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ "hub.challenge": "abc123" });
  });

  it("invalid hub.verify_token → 403", async () => {
    const res = await GET(
      getReq({
        "hub.mode": "subscribe",
        "hub.challenge": "abc123",
        "hub.verify_token": "wrong-token",
      }) as never,
    );

    expect(res.status).toBe(403);
  });
});
