import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  getItemResult: vi.fn(),
}));

import * as SecureStore from "@/lib/secure-store";

const mockGetItem = vi.mocked(SecureStore.getItemAsync);
const mockSetItem = vi.mocked(SecureStore.setItemAsync);

function batchResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => [{ result: { data: { json: data } } }],
  };
}

// Fresh module state per test — lib/server.ts and lib/trpc.ts both hold
// module-level mutable state (cachedUrl, the lazily-rebuilt trpc client).
async function loadTrpcWithServerUrl(url: string) {
  vi.resetModules();
  const server = await import("../server");
  await server.setApiUrl(url);
  const trpcModule = await import("../trpc");
  return { server, trpc: trpcModule.trpc };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetItem.mockResolvedValue("token-abc");
  mockSetItem.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trpc — dynamic server URL", () => {
  it("targets the current server's /api/trpc, carries the Authorization header, and superjson-encodes the input", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(batchResponse({ token: "t", user: { id: "u1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { trpc } = await loadTrpcWithServerUrl("https://first.example.com");

    await trpc.auth.mobileSignIn.mutate({ email: "a@b.com", password: "secret" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];

    expect(String(calledUrl)).toContain("https://first.example.com/api/trpc");

    const headers = new Headers(calledInit.headers as Record<string, string>);
    expect(headers.get("authorization")).toBe("Bearer token-abc");

    // superjson wraps every batched input under a `json` key — a raw
    // (non-superjson) client would send `{"0":{"email":...}}` with no
    // wrapper, so this also proves the transformer is actually wired up.
    const body = JSON.parse(calledInit.body as string);
    expect(body["0"].json).toEqual({ email: "a@b.com", password: "secret" });
  });

  it("rebuilds the underlying client and targets the new server after setApiUrl, without touching existing call sites", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(batchResponse({ token: "t", user: { id: "u1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { trpc, server } = await loadTrpcWithServerUrl("https://first.example.com");

    await trpc.auth.mobileSignIn.mutate({ email: "a@b.com", password: "secret" });
    await server.setApiUrl("https://second.example.com");
    await trpc.auth.mobileSignIn.mutate({ email: "a@b.com", password: "secret" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("https://first.example.com/api/trpc");
    expect(String(fetchMock.mock.calls[1][0])).toContain("https://second.example.com/api/trpc");
  });

  it("omits the Authorization header when there's no stored token", async () => {
    mockGetItem.mockResolvedValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(batchResponse({ token: "t", user: { id: "u1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { trpc } = await loadTrpcWithServerUrl("https://first.example.com");
    await trpc.auth.mobileSignIn.mutate({ email: "a@b.com", password: "secret" });

    const [, calledInit] = fetchMock.mock.calls[0];
    const headers = new Headers(calledInit.headers as Record<string, string>);
    expect(headers.get("authorization")).toBeNull();
  });
});
