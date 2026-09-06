import { describe, expect, it, vi, beforeEach } from "vitest";

const worker = vi.hoisted(() => ({
  runWebhookWorkerTick: vi.fn(),
  getWebhookWorkerStatus: vi.fn(),
}));
vi.mock("@zor/db", () => ({ db: {} }));
vi.mock("@zor/api/src/lib/webhook-worker", () => worker);

import { GET } from "../route";

const SECRET = "test-cron-secret";

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  worker.runWebhookWorkerTick.mockReset();
});

function req(headers: Record<string, string> = {}) {
  return new Request("https://x/api/cron/webhook-worker", {
    method: "GET",
    headers,
  });
}

describe("GET /api/cron/webhook-worker", () => {
  it("401 without bearer", async () => {
    const r = await GET(req());
    expect(r.status).toBe(401);
    expect(worker.runWebhookWorkerTick).not.toHaveBeenCalled();
  });

  it("401 with wrong bearer", async () => {
    const r = await GET(req({ Authorization: "Bearer wrong" }));
    expect(r.status).toBe(401);
  });

  it("200 + counts with correct bearer", async () => {
    worker.runWebhookWorkerTick.mockResolvedValue({
      reclaimed: 0,
      processed: 2,
      succeeded: 2,
      skipped: 0,
      failed: 0,
      dlq: 0,
    });
    const r = await GET(req({ Authorization: `Bearer ${SECRET}` }));
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toEqual({
      reclaimed: 0,
      processed: 2,
      succeeded: 2,
      skipped: 0,
      failed: 0,
      dlq: 0,
    });
  });
});
