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
  worker.getWebhookWorkerStatus.mockReset();
  worker.runWebhookWorkerTick.mockReset();
});

describe("GET /api/cron/webhook-worker/status", () => {
  it("401 without bearer", async () => {
    const r = await GET(
      new Request("https://x/api/cron/webhook-worker/status"),
    );
    expect(r.status).toBe(401);
  });

  it("returns status JSON with correct bearer and does not advance queue", async () => {
    worker.getWebhookWorkerStatus.mockResolvedValue({
      dueCount: 1,
      oldestDueAgeSec: 42,
      pendingCount: 3,
      processingCount: 0,
      dlqCount: 1,
      oldestProcessingAgeSec: null,
    });
    const r = await GET(
      new Request("https://x/api/cron/webhook-worker/status", {
        headers: { Authorization: `Bearer ${SECRET}` },
      }),
    );
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({
      dueCount: 1,
      dlqCount: 1,
    });
    expect(worker.runWebhookWorkerTick).not.toHaveBeenCalled();
  });
});
