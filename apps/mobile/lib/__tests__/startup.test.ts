import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server", () => ({
  hydrateServerUrl: vi.fn(),
}));
vi.mock("@/lib/database-readiness", () => ({
  ensureDatabaseReady: vi.fn(),
}));

import { hydrateServerUrl } from "@/lib/server";
import { ensureDatabaseReady } from "@/lib/database-readiness";
import { prepareAppStartup, prepareOriginStartup } from "../startup";

const mockHydrateServerUrl = vi.mocked(hydrateServerUrl);
const mockEnsureDatabaseReady = vi.mocked(ensureDatabaseReady);

describe("prepareOriginStartup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureDatabaseReady.mockResolvedValue("zor.db");
  });

  it("prepares the origin before database readiness", async () => {
    const events: string[] = [];
    mockHydrateServerUrl.mockImplementation(async () => {
      events.push("origin:marked");
      return "https://zor.hiten-patel.co.uk";
    });
    mockEnsureDatabaseReady.mockImplementation(async () => {
      events.push("database:ready");
      return "zor.db";
    });

    await expect(prepareAppStartup()).resolves.toEqual({ databaseName: "zor.db" });
    expect(events).toEqual(["origin:marked", "database:ready"]);
  });

  it("waits for origin hydration", async () => {
    mockHydrateServerUrl.mockResolvedValue("https://zor.hiten-patel.co.uk");

    await expect(prepareOriginStartup()).resolves.toBeUndefined();

    expect(mockHydrateServerUrl).toHaveBeenCalledTimes(1);
  });

  it("propagates preparation failures", async () => {
    mockHydrateServerUrl.mockRejectedValue(new Error("keychain unavailable"));

    await expect(prepareOriginStartup()).rejects.toThrow("keychain unavailable");
  });
});
