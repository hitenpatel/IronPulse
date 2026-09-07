import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import * as SecureStore from "@/lib/secure-store";

const mockGetItem = vi.mocked(SecureStore.getItemAsync);
const mockSetItem = vi.mocked(SecureStore.setItemAsync);

const CLOUD_DEFAULT = "https://ironpulse.hiten-patel.co.uk";

// lib/server.ts holds module-level cache state (cachedUrl / hydrated /
// hydrationPromise). vi.resetModules() + a fresh dynamic import gives each
// test its own instance, same pattern as lib/__tests__/notifications.test.ts.
async function loadServer() {
  vi.resetModules();
  return import("../server");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("normalizeServerUrl", () => {
  it("prefixes https when the input has no scheme", async () => {
    const { normalizeServerUrl } = await loadServer();
    expect(normalizeServerUrl("myserver.example.com")).toBe("https://myserver.example.com");
  });

  it("leaves an existing scheme alone", async () => {
    const { normalizeServerUrl } = await loadServer();
    expect(normalizeServerUrl("http://192.168.1.5:3000")).toBe("http://192.168.1.5:3000");
    expect(normalizeServerUrl("https://zor.example.com")).toBe("https://zor.example.com");
  });

  it("trims whitespace and a trailing slash", async () => {
    const { normalizeServerUrl } = await loadServer();
    expect(normalizeServerUrl("  myserver.example.com/  ")).toBe("https://myserver.example.com");
  });
});

describe("getApiUrl / hasServerUrl before hydration", () => {
  it("falls back to the cloud default and reports no server chosen yet", async () => {
    const { getApiUrl, hasServerUrl } = await loadServer();
    expect(getApiUrl()).toBe(CLOUD_DEFAULT);
    expect(hasServerUrl()).toBe(false);
  });
});

describe("hydrateServerUrl", () => {
  it("restores a previously persisted server-url", async () => {
    mockGetItem.mockImplementation(async (key: string) =>
      key === "server-url" ? "https://my-instance.example.com" : null,
    );
    const { hydrateServerUrl, getApiUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBe("https://my-instance.example.com");
    expect(getApiUrl()).toBe("https://my-instance.example.com");
    expect(hasServerUrl()).toBe(true);
  });

  it("returns null (needs picker) on a genuine first launch", async () => {
    mockGetItem.mockResolvedValue(null);
    const { hydrateServerUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBeNull();
    expect(hasServerUrl()).toBe(false);
  });

  it("backwards compat: legacy auth-token with no server-url defaults to the cloud URL and persists it", async () => {
    mockGetItem.mockImplementation(async (key: string) => {
      if (key === "server-url") return null;
      if (key === "auth-token") return "legacy-token-abc";
      return null;
    });
    const { hydrateServerUrl, getApiUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBe(CLOUD_DEFAULT);
    expect(getApiUrl()).toBe(CLOUD_DEFAULT);
    expect(hasServerUrl()).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith("server-url", CLOUD_DEFAULT);
  });

  it("is idempotent — only the first call reads SecureStore", async () => {
    mockGetItem.mockResolvedValue("https://my-instance.example.com");
    const { hydrateServerUrl } = await loadServer();

    await hydrateServerUrl();
    await hydrateServerUrl();
    await hydrateServerUrl();

    expect(mockGetItem).toHaveBeenCalledTimes(1);
  });

  it("concurrent callers share the same in-flight hydration", async () => {
    let resolveGetItem: (v: string | null) => void = () => {};
    mockGetItem.mockImplementation(
      () => new Promise((resolve) => { resolveGetItem = resolve; }),
    );
    const { hydrateServerUrl } = await loadServer();

    const first = hydrateServerUrl();
    const second = hydrateServerUrl();
    resolveGetItem("https://my-instance.example.com");

    expect(await first).toBe("https://my-instance.example.com");
    expect(await second).toBe("https://my-instance.example.com");
    expect(mockGetItem).toHaveBeenCalledTimes(1);
  });

  it("treats a SecureStore read failure as first-launch rather than guessing a server", async () => {
    mockGetItem.mockRejectedValue(new Error("keychain unavailable"));
    const { hydrateServerUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBeNull();
    expect(hasServerUrl()).toBe(false);
  });
});

describe("setApiUrl / onServerUrlChange", () => {
  it("normalizes, persists, and activates the URL", async () => {
    const { setApiUrl, getApiUrl, hasServerUrl } = await loadServer();

    const result = await setApiUrl("myserver.example.com");

    expect(result).toBe("https://myserver.example.com");
    expect(getApiUrl()).toBe("https://myserver.example.com");
    expect(hasServerUrl()).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith("server-url", "https://myserver.example.com");
  });

  it("notifies subscribers with the normalized URL", async () => {
    const { setApiUrl, onServerUrlChange } = await loadServer();
    const listener = vi.fn();
    onServerUrlChange(listener);

    await setApiUrl("http://10.0.0.5:3000");

    expect(listener).toHaveBeenCalledWith("http://10.0.0.5:3000");
  });

  it("stops notifying after unsubscribe", async () => {
    const { setApiUrl, onServerUrlChange } = await loadServer();
    const listener = vi.fn();
    const unsubscribe = onServerUrlChange(listener);
    unsubscribe();

    await setApiUrl("myserver.example.com");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("validateServerUrl", () => {
  it("returns ok with the normalized url on a healthy 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok" }),
      }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({ ok: true, url: "https://myserver.example.com" });
    expect(fetch).toHaveBeenCalledWith(
      "https://myserver.example.com/api/health",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("accepts a degraded-but-200 health response (real /api/health can report degraded)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "degraded", services: {} }),
      }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("https://myserver.example.com");

    expect(result.ok).toBe(true);
  });

  it("maps a non-200 response to the unreachable/'Couldn't reach that address' state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({
      ok: false,
      reason: "unreachable",
      message: "Couldn't reach that address",
    });
  });

  it("maps a generic network failure (DNS/refused) to unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network request failed")));
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({
      ok: false,
      reason: "unreachable",
      message: "Couldn't reach that address",
    });
  });

  it("maps a TLS-flavoured error message to the tls state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Hostname/IP does not match certificate's altnames")),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({
      ok: false,
      reason: "tls",
      message: "TLS error — for local dev, set up Caddy with a real cert",
    });
  });

  it("maps a Node-style TLS error code to the tls state", async () => {
    const err = Object.assign(new Error("self signed certificate"), {
      code: "DEPTH_ZERO_SELF_SIGNED_CERT",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toBe("tls");
  });

  it("maps a 200 response with an unparsable body to invalid-response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({
      ok: false,
      reason: "invalid-response",
      message: "Doesn't look like a Zor server",
    });
  });

  it("maps a 200 response with the wrong JSON shape to invalid-response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hello: "world" }) }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({
      ok: false,
      reason: "invalid-response",
      message: "Doesn't look like a Zor server",
    });
  });

  it("auto-prefixes https before calling fetch when the URL has no scheme", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
    vi.stubGlobal("fetch", fetchMock);
    const { validateServerUrl } = await loadServer();

    await validateServerUrl("myserver.example.com");

    expect(fetchMock.mock.calls[0][0]).toBe("https://myserver.example.com/api/health");
  });

  it("times out after 10s and maps to the timeout state", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, opts: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts.signal.addEventListener("abort", () => {
              const err = new Error("Aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      ),
    );
    const { validateServerUrl } = await loadServer();

    const pending = validateServerUrl("myserver.example.com");
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await pending;

    expect(result).toEqual({
      ok: false,
      reason: "timeout",
      message: "Server didn't respond — check the URL and try again",
    });
  });
});
