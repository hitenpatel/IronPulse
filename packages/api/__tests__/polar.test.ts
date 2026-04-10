import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapPolarType,
  mapPolarActivity,
  refreshPolarToken,
  importPolarActivity,
  runPolarBackfill,
  PolarRateLimitError,
  type PolarExercise,
} from "../src/lib/polar";

// ─── Mocks ─────────────────────────────────────────────

vi.mock("../src/lib/encryption", () => ({
  encryptToken: (t: string) => `enc:${t}`,
  decryptToken: (t: string) => t.replace(/^enc:/, ""),
}));

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

// ─── Helpers ───────────────────────────────────────────

function makePolarExercise(overrides: Partial<PolarExercise> = {}): PolarExercise {
  return {
    id: "abc123",
    sport: "RUNNING",
    start_time: "2026-04-09T07:30:00.000Z",
    duration: "PT1H30M",
    distance: 12500,
    ascent: 180,
    heart_rate: { average: 145, maximum: 172 },
    calories: 820,
    ...overrides,
  };
}

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    userId: "user-1",
    provider: "polar",
    providerAccountId: "polar-user-42",
    accessToken: "enc:valid-access",
    refreshToken: "enc:valid-refresh",
    tokenExpiresAt: new Date(Date.now() + 3600_000), // 1 hour from now
    syncEnabled: true,
    ...overrides,
  };
}

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    cardioSession: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    deviceConnection: {
      findUnique: vi.fn().mockResolvedValue(makeConnection()),
      update: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

// ─── mapPolarType ──────────────────────────────────────

describe("mapPolarType", () => {
  it.each([
    ["RUNNING", "run"],
    ["CYCLING", "cycle"],
    ["SWIMMING", "swim"],
    ["HIKING", "hike"],
    ["WALKING", "walk"],
    ["ROWING", "row"],
  ])("maps %s → %s", (polar, expected) => {
    expect(mapPolarType(polar)).toBe(expected);
  });

  it('returns "other" for unknown types', () => {
    expect(mapPolarType("CROSSFIT")).toBe("other");
    expect(mapPolarType("")).toBe("other");
  });
});

// ─── mapPolarActivity ──────────────────────────────────

describe("mapPolarActivity", () => {
  it("maps a full Polar exercise to CardioSession shape", () => {
    const exercise = makePolarExercise();
    const result = mapPolarActivity(exercise, "user-1");

    expect(result).toEqual({
      userId: "user-1",
      externalId: "polar:abc123",
      type: "run",
      source: "polar",
      startedAt: new Date("2026-04-09T07:30:00.000Z"),
      durationSeconds: 5400, // 1h30m
      distanceMeters: 12500,
      elevationGainM: 180,
      avgHeartRate: 145,
      maxHeartRate: 172,
      calories: 820,
      notes: undefined,
    });
  });

  it("parses hours-only duration", () => {
    const result = mapPolarActivity(makePolarExercise({ duration: "PT2H" }), "u");
    expect(result.durationSeconds).toBe(7200);
  });

  it("parses minutes-only duration", () => {
    const result = mapPolarActivity(makePolarExercise({ duration: "PT45M" }), "u");
    expect(result.durationSeconds).toBe(2700);
  });

  it("parses seconds-only duration", () => {
    const result = mapPolarActivity(makePolarExercise({ duration: "PT30S" }), "u");
    expect(result.durationSeconds).toBe(30);
  });

  it("parses complex duration with fractional seconds", () => {
    const result = mapPolarActivity(
      makePolarExercise({ duration: "PT1H15M30.5S" }),
      "u",
    );
    expect(result.durationSeconds).toBe(3600 + 900 + 31); // rounds 30.5 → 31
  });

  it("returns 0 for unparseable duration", () => {
    const result = mapPolarActivity(makePolarExercise({ duration: "INVALID" }), "u");
    expect(result.durationSeconds).toBe(0);
  });

  it("handles missing optional fields gracefully", () => {
    const exercise = makePolarExercise({
      ascent: undefined,
      heart_rate: undefined,
      calories: undefined,
    });
    const result = mapPolarActivity(exercise, "user-1");

    expect(result.elevationGainM).toBeUndefined();
    expect(result.avgHeartRate).toBeUndefined();
    expect(result.maxHeartRate).toBeUndefined();
    expect(result.calories).toBeUndefined();
  });

  it("maps unknown sport to 'other'", () => {
    const result = mapPolarActivity(makePolarExercise({ sport: "PILATES" }), "u");
    expect(result.type).toBe("other");
  });
});

// ─── refreshPolarToken ─────────────────────────────────

describe("refreshPolarToken", () => {
  beforeEach(() => {
    vi.stubEnv("POLAR_CLIENT_ID", "test-client-id");
    vi.stubEnv("POLAR_CLIENT_SECRET", "test-client-secret");
    vi.restoreAllMocks();
  });

  it("returns new tokens on success", async () => {
    const tokenPayload = {
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 7200,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(tokenPayload),
      }),
    );

    const result = await refreshPolarToken("old-refresh");

    expect(result).toEqual(tokenPayload);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "https://polarremote.com/v2/oauth2/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      }),
    );
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      }),
    );

    await expect(refreshPolarToken("bad-refresh")).rejects.toThrow(
      "Polar token refresh failed: 401 Unauthorized",
    );
  });
});

// ─── importPolarActivity ───────────────────────────────

describe("importPolarActivity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips import when externalId already exists (dedup)", async () => {
    const db = makeDb();
    db.cardioSession.findFirst.mockResolvedValue({ id: "existing" });

    const connection = makeConnection();
    const result = await importPolarActivity("abc123", connection, db);

    expect(result).toBeNull();
    expect(db.cardioSession.create).not.toHaveBeenCalled();
  });

  it("creates CardioSession with correctly mapped fields", async () => {
    const db = makeDb();
    const exercise = makePolarExercise();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(exercise),
      }),
    );

    const connection = makeConnection();
    await importPolarActivity("abc123", connection, db);

    expect(db.cardioSession.create).toHaveBeenCalledOnce();
    const createArg = db.cardioSession.create.mock.calls[0][0].data;
    expect(createArg).toMatchObject({
      externalId: "polar:abc123",
      type: "run",
      source: "polar",
      userId: "user-1",
      durationSeconds: 5400,
      distanceMeters: 12500,
    });
    expect(createArg.id).toBeDefined(); // UUID assigned
  });
});

// ─── runPolarBackfill ──────────────────────────────────

describe("runPolarBackfill", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pulls exercises and imports each, then updates lastSyncedAt", async () => {
    const db = makeDb();
    const connection = makeConnection();
    db.deviceConnection.findUnique.mockResolvedValue(connection);

    const fetchMock = vi.fn();

    // 1st call: createExerciseTransaction
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          "transaction-id": 999,
          "resource-uri": "https://polar.example/tx/999",
        }),
    });

    // 2nd call: listTransactionExercises
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          exercises: [
            "https://polar.example/exercises/ex1",
            "https://polar.example/exercises/ex2",
          ],
        }),
    });

    // 3rd call: getExercise for ex1
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(makePolarExercise({ id: "ex1", sport: "CYCLING" })),
    });

    // 4th call: getExercise for ex2
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(makePolarExercise({ id: "ex2", sport: "SWIMMING" })),
    });

    vi.stubGlobal("fetch", fetchMock);

    await runPolarBackfill("conn-1", db);

    // Both exercises imported
    expect(db.cardioSession.create).toHaveBeenCalledTimes(2);

    // Verify sport mapping per exercise
    const firstCreate = db.cardioSession.create.mock.calls[0][0].data;
    expect(firstCreate.type).toBe("cycle");
    expect(firstCreate.externalId).toBe("polar:ex1");

    const secondCreate = db.cardioSession.create.mock.calls[1][0].data;
    expect(secondCreate.type).toBe("swim");
    expect(secondCreate.externalId).toBe("polar:ex2");

    // lastSyncedAt updated
    expect(db.deviceConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conn-1" },
        data: expect.objectContaining({ lastSyncedAt: expect.any(Date) }),
      }),
    );
  });

  it("returns early when connection is not found", async () => {
    const db = makeDb();
    db.deviceConnection.findUnique.mockResolvedValue(null);

    vi.stubGlobal("fetch", vi.fn());

    await runPolarBackfill("nonexistent", db);

    expect(fetch).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });
});
