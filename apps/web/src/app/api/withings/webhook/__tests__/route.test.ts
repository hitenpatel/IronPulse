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

import { hashPayload } from "@zor/api/src/lib/webhook-external-id";
import { GET, HEAD, POST } from "../route";

function postReq(fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  return new Request("https://example/api/withings/webhook", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

const validFields = {
  userid: "12345",
  appli: "1",
  startdate: "1000",
  enddate: "2000",
};

beforeEach(() => {
  db.deviceConnection.findFirst.mockReset();
  db.webhookEvent.create.mockReset();
  db.deviceConnection.findFirst.mockResolvedValue(null);
  db.webhookEvent.create.mockResolvedValue({});
});

describe("POST /api/withings/webhook", () => {
  it("appli=1 with matching connection → 200; inserts row with userId set", async () => {
    db.deviceConnection.findFirst.mockResolvedValue({ userId: "user-123" });

    const res = await POST(postReq(validFields) as never);

    const expectedExternalId = hashPayload({
      userid: "12345",
      appli: 1,
      startdate: 1000,
      enddate: 2000,
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(1);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "withings",
        externalId: expectedExternalId,
        payload: { userid: "12345", appli: 1, startdate: 1000, enddate: 2000 },
        userId: "user-123",
        status: "pending",
        nextAttemptAt: expect.any(Date),
      }),
    });
    expect(db.deviceConnection.findFirst).toHaveBeenCalledWith({
      where: { provider: "withings", providerAccountId: "12345" },
      select: { userId: true },
    });
  });

  it("appli=4 with no connection → 200; inserts row with userId=null", async () => {
    db.deviceConnection.findFirst.mockResolvedValue(null);

    const res = await POST(postReq({ ...validFields, appli: "4" }) as never);

    expect(res.status).toBe(200);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it("appli=44 (sleep, out of scope) → 200, zero rows inserted", async () => {
    const res = await POST(postReq({ ...validFields, appli: "44" }) as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("missing userid → 400, zero rows inserted", async () => {
    const { userid: _userid, ...rest } = validFields;
    const res = await POST(postReq(rest) as never);

    expect(res.status).toBe(400);
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
    expect(db.deviceConnection.findFirst).not.toHaveBeenCalled();
  });

  it("non-P2002 DB throw → 500", async () => {
    db.webhookEvent.create.mockRejectedValue(new Error("connection refused"));

    const res = await POST(postReq(validFields) as never);

    expect(res.status).toBe(500);
  });

  it("duplicate delivery: two identical POSTs both 200, second is idempotent via P2002", async () => {
    db.webhookEvent.create.mockResolvedValueOnce({});
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["provider_external_id_unique"] },
    });
    db.webhookEvent.create.mockRejectedValueOnce(p2002);

    const res1 = await POST(postReq(validFields) as never);
    const res2 = await POST(postReq(validFields) as never);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(2);
  });
});

describe("HEAD /api/withings/webhook", () => {
  it("returns 200 with empty body", async () => {
    const res = await HEAD();
    expect(res.status).toBe(200);
  });
});

describe("GET /api/withings/webhook", () => {
  it("returns 200 with empty body", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
