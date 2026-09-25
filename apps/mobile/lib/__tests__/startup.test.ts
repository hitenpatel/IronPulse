import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server", () => ({
  hydrateServerUrl: vi.fn(),
}));

import { hydrateServerUrl } from "@/lib/server";
import { prepareOriginStartup } from "../startup";

const mockHydrateServerUrl = vi.mocked(hydrateServerUrl);

describe("prepareOriginStartup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
