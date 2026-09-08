import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SecureReadResult } from "../secure-store";

vi.mock("@/lib/secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  getItemResult: vi.fn(),
}));

import * as SecureStore from "@/lib/secure-store";

const mockGetItemResult = vi.mocked(SecureStore.getItemResult);
const mockSetItem = vi.mocked(SecureStore.setItemAsync);

const CLOUD_DEFAULT = "https://ironpulse.hiten-patel.co.uk";

const ABSENT: SecureReadResult = { status: "absent" };
const found = (value: string): SecureReadResult => ({ status: "found", value });
const errored = (error: unknown = new Error("keychain unavailable")): SecureReadResult => ({
  status: "error",
  error,
});

// lib/server.ts holds module-level cache state (cachedUrl / hydrated /
// hydrationPromise). vi.resetModules() + a fresh dynamic import gives each
// test its own instance, same pattern as lib/__tests__/notifications.test.ts.
async function loadServer() {
  vi.resetModules();
  return import("../server");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetItemResult.mockResolvedValue(ABSENT);
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
    mockGetItemResult.mockImplementation(async (key: string) =>
      key === "server-url" ? found("https://my-instance.example.com") : ABSENT,
    );
    const { hydrateServerUrl, getApiUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBe("https://my-instance.example.com");
    expect(getApiUrl()).toBe("https://my-instance.example.com");
    expect(hasServerUrl()).toBe(true);
  });

  it("returns null (needs picker) on a genuine first launch", async () => {
    mockGetItemResult.mockResolvedValue(ABSENT);
    const { hydrateServerUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBeNull();
    expect(hasServerUrl()).toBe(false);
  });

  it("backwards compat: legacy auth-token with no server-url defaults to the cloud URL and persists it", async () => {
    mockGetItemResult.mockImplementation(async (key: string) => {
      if (key === "server-url") return ABSENT;
      if (key === "auth-token") return found("legacy-token-abc");
      return ABSENT;
    });
    const { hydrateServerUrl, getApiUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBe(CLOUD_DEFAULT);
    expect(getApiUrl()).toBe(CLOUD_DEFAULT);
    expect(hasServerUrl()).toBe(true);
    expect(mockSetItem).toHaveBeenCalledWith("server-url", CLOUD_DEFAULT);
  });

  it("is idempotent — only the first call reads SecureStore", async () => {
    mockGetItemResult.mockResolvedValue(found("https://my-instance.example.com"));
    const { hydrateServerUrl } = await loadServer();

    await hydrateServerUrl();
    await hydrateServerUrl();
    await hydrateServerUrl();

    expect(mockGetItemResult).toHaveBeenCalledTimes(1);
  });

  it("concurrent callers share the same in-flight hydration", async () => {
    let resolveGetItem: (v: SecureReadResult) => void = () => {};
    mockGetItemResult.mockImplementation(
      () => new Promise((resolve) => { resolveGetItem = resolve; }),
    );
    const { hydrateServerUrl } = await loadServer();

    const first = hydrateServerUrl();
    const second = hydrateServerUrl();
    resolveGetItem(found("https://my-instance.example.com"));

    expect(await first).toBe("https://my-instance.example.com");
    expect(await second).toBe("https://my-instance.example.com");
    expect(mockGetItemResult).toHaveBeenCalledTimes(1);
  });

  it("treats a server-url read failure as needs-picker rather than guessing a server", async () => {
    mockGetItemResult.mockImplementation(async (key: string) =>
      key === "server-url" ? errored() : ABSENT,
    );
    const { hydrateServerUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBeNull();
    expect(hasServerUrl()).toBe(false);
  });

  it("REGRESSION: a self-hosted user's real server-url must never be overwritten by the cloud default when only that key fails to read (even though auth-token still reads fine)", async () => {
    // The exact scenario from the review: user self-hosts at
    // https://gym.example, is signed in (auth-token reads fine), but an OS
    // upgrade / Auto Backup restore makes the `server-url` keychain entry
    // specifically unreadable. Silently falling into the legacy-cloud
    // migration branch here would point them at the cloud AND destroy the
    // real URL by persisting the cloud default over it.
    mockGetItemResult.mockImplementation(async (key: string) => {
      if (key === "server-url") return errored(new Error("keychain locked"));
      if (key === "auth-token") return found("self-hosted-token-abc");
      return ABSENT;
    });
    const { hydrateServerUrl, getApiUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBeNull();
    expect(hasServerUrl()).toBe(false);
    // getApiUrl() still falls back to the cloud default for display/safety
    // purposes, but nothing was ever WRITTEN — the real value in the
    // keychain (which we couldn't read this time) survives untouched.
    expect(getApiUrl()).toBe(CLOUD_DEFAULT);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it("does not consult the legacy auth-token at all when server-url read fails (fails closed, not just closed-ish)", async () => {
    const tokenCheck = vi.fn(async () => found("self-hosted-token-abc"));
    mockGetItemResult.mockImplementation(async (key: string) => {
      if (key === "server-url") return errored();
      if (key === "auth-token") return tokenCheck();
      return ABSENT;
    });
    const { hydrateServerUrl } = await loadServer();

    await hydrateServerUrl();

    expect(tokenCheck).not.toHaveBeenCalled();
  });

  it("fails closed to the picker (not the cloud migration) when server-url is absent but the auth-token read also fails", async () => {
    mockGetItemResult.mockImplementation(async (key: string) => {
      if (key === "server-url") return ABSENT;
      if (key === "auth-token") return errored();
      return ABSENT;
    });
    const { hydrateServerUrl, hasServerUrl } = await loadServer();

    const resolved = await hydrateServerUrl();

    expect(resolved).toBeNull();
    expect(hasServerUrl()).toBe(false);
    expect(mockSetItem).not.toHaveBeenCalled();
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

  it("REGRESSION: stores the post-redirect origin, not the pre-redirect one — fetch follows redirects by default", async () => {
    // A host 301s the bare domain to its real origin. If we persisted the
    // pre-redirect `url` we asked for, every subsequent tRPC call would
    // redirect too, and OkHttp/NSURLSession downgrade POST -> GET across a
    // 301/302/303 — mutations would silently break despite this health
    // check reporting success.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        url: "https://www.myserver.example.com/api/health",
        json: async () => ({ status: "ok" }),
      }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({ ok: true, url: "https://www.myserver.example.com" });
  });

  it("falls back to the requested url when the fetch response doesn't expose .url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) }),
    );
    const { validateServerUrl } = await loadServer();

    const result = await validateServerUrl("myserver.example.com");

    expect(result).toEqual({ ok: true, url: "https://myserver.example.com" });
  });
});

describe("normalizeServerUrl — scheme narrowing", () => {
  it("only recognises http/https as 'already has a scheme'", async () => {
    const { normalizeServerUrl } = await loadServer();

    // file:// and ftp:// are NOT passed through — they'd otherwise reach
    // settings/integrations.tsx's `new URL(getApiUrl()).host` (render
    // crash) or Linking.openURL with an unexpected scheme.
    expect(normalizeServerUrl("file:///etc/passwd")).toBe("https://file:///etc/passwd");
    expect(normalizeServerUrl("ftp://myserver.example.com")).toBe(
      "https://ftp://myserver.example.com",
    );
    expect(normalizeServerUrl("javascript:alert(1)")).toBe("https://javascript:alert(1)");
  });

  it("still leaves http/https alone", async () => {
    const { normalizeServerUrl } = await loadServer();
    expect(normalizeServerUrl("http://myserver.example.com")).toBe(
      "http://myserver.example.com",
    );
    expect(normalizeServerUrl("https://myserver.example.com")).toBe(
      "https://myserver.example.com",
    );
  });
});

describe("isInsecureServerUrl", () => {
  it("flags http:// as insecure", async () => {
    const { isInsecureServerUrl } = await loadServer();
    expect(isInsecureServerUrl("http://192.168.1.5:3000")).toBe(true);
  });

  it("does not flag https://", async () => {
    const { isInsecureServerUrl } = await loadServer();
    expect(isInsecureServerUrl("https://myserver.example.com")).toBe(false);
  });
});
