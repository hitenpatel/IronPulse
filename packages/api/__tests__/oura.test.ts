import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapOuraSleep,
  mapOuraReadiness,
  fetchOuraApi,
  OuraRateLimitError,
  importOuraSleep,
  importOuraReadiness,
  runOuraBackfill,
  type OuraSleepDocument,
  type OuraReadiness,
} from "../src/lib/oura";

// ─── Fixtures ─────────────────────────────────────────

function makeSleepDoc(overrides?: Partial<OuraSleepDocument>): OuraSleepDocument {
  return {
    id: "sleep-abc-123",
    day: "2026-04-08",
    bedtime_start: "2026-04-07T23:15:00+01:00",
    bedtime_end: "2026-04-08T07:05:00+01:00",
    total_sleep_duration: 25200, // 420 min
    time_in_bed: 28200, // 470 min → efficiency ~0.894 → "good"
    deep_sleep_duration: 5400, // 90 min
    light_sleep_duration: 10800, // 180 min
    rem_sleep_duration: 6600, // 110 min
    awake_time: 2400, // 40 min
    average_heart_rate: 52,
    lowest_heart_rate: 45,
    readiness_score_delta: null,
    ...overrides,
  };
}

function makeReadiness(overrides?: Partial<OuraReadiness>): OuraReadiness {
  return {
    id: "readiness-xyz-456",
    day: "2026-04-08",
    score: 82,
    temperature_deviation: 0.1,
    contributors: {
      activity_balance: 78,
      body_temperature: 90,
      hrv_balance: 75,
      previous_day_activity: 80,
      previous_night: 85,
      recovery_index: 88,
      resting_heart_rate: 92,
      sleep_balance: 79,
    },
    ...overrides,
  };
}

// ─── mapOuraSleep ─────────────────────────────────────

describe("mapOuraSleep", () => {
  const userId = "user-001";

  it("parses bedtime and wakeTime from ISO strings", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.bedtime).toEqual(new Date("2026-04-07T23:15:00+01:00"));
    expect(result.wakeTime).toEqual(new Date("2026-04-08T07:05:00+01:00"));
  });

  it("calculates duration in minutes from seconds", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.durationMins).toBe(420);
  });

  it("converts sleep stages from seconds to minutes", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.stages).toEqual({
      deep: 90,
      light: 180,
      rem: 110,
      awake: 40,
    });
  });

  it("derives quality as 'good' for efficiency ~0.89", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.quality).toBe("good");
  });

  it("derives quality as 'excellent' for efficiency >= 0.9", () => {
    const doc = makeSleepDoc({
      total_sleep_duration: 27000,
      time_in_bed: 28000, // ~0.964
    });
    expect(mapOuraSleep(doc, userId).quality).toBe("excellent");
  });

  it("derives quality as 'fair' for efficiency ~0.7", () => {
    const doc = makeSleepDoc({
      total_sleep_duration: 21000,
      time_in_bed: 30000, // 0.7
    });
    expect(mapOuraSleep(doc, userId).quality).toBe("fair");
  });

  it("derives quality as 'poor' for efficiency < 0.65", () => {
    const doc = makeSleepDoc({
      total_sleep_duration: 15000,
      time_in_bed: 30000, // 0.5
    });
    expect(mapOuraSleep(doc, userId).quality).toBe("poor");
  });

  it("uses readinessScore as score when provided", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId, 85);
    expect(result.score).toBe(85);
  });

  it("sets score to null when readinessScore is not provided", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.score).toBeNull();
  });

  it("formats externalId as oura:{id}", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.externalId).toBe("oura:sleep-abc-123");
  });

  it("sets source to oura", () => {
    const result = mapOuraSleep(makeSleepDoc(), userId);
    expect(result.source).toBe("oura");
  });
});

// ─── mapOuraReadiness ─────────────────────────────────

describe("mapOuraReadiness", () => {
  const userId = "user-002";

  it("extracts readinessScore from score", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.measurements.readinessScore).toBe(82);
  });

  it("extracts hrvBalance from contributors", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.measurements.hrvBalance).toBe(75);
  });

  it("extracts restingHr from contributors", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.measurements.restingHr).toBe(92);
  });

  it("includes temperatureDeviation and other contributor fields", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.measurements.temperatureDeviation).toBe(0.1);
    expect(result.measurements.activityBalance).toBe(78);
    expect(result.measurements.recoveryIndex).toBe(88);
    expect(result.measurements.sleepBalance).toBe(79);
  });

  it("formats externalId as oura:{id}", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.externalId).toBe("oura:readiness-xyz-456");
  });

  it("sets source to oura", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.source).toBe("oura");
  });

  it("parses date from day string", () => {
    const result = mapOuraReadiness(makeReadiness(), userId);
    expect(result.date).toEqual(new Date("2026-04-08"));
  });
});

// ─── fetchOuraApi ─────────────────────────────────────

describe("fetchOuraApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends GET request with Bearer token and returns JSON", async () => {
    const payload = { data: [{ id: "1" }], next_token: null };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
        headers: new Headers(),
      }),
    );

    const result = await fetchOuraApi("/usercollection/sleep", "tok_abc", {
      start_date: "2026-04-01",
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, opts] = (fetch as any).mock.calls[0];
    expect(url).toContain("/usercollection/sleep");
    expect(url).toContain("start_date=2026-04-01");
    expect(opts.headers.Authorization).toBe("Bearer tok_abc");
    expect(result).toEqual(payload);
  });

  it("throws OuraRateLimitError on 429 with Retry-After header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "Retry-After": "120" }),
      }),
    );

    await expect(
      fetchOuraApi("/usercollection/sleep", "tok_abc"),
    ).rejects.toThrow(OuraRateLimitError);
  });

  it("throws OuraRateLimitError with default reset when no Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers(),
      }),
    );

    try {
      await fetchOuraApi("/usercollection/sleep", "tok_abc");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(OuraRateLimitError);
      // Default fallback is ~15 minutes from now
      expect((err as OuraRateLimitError).resetAt.getTime()).toBeGreaterThan(
        Date.now() + 14 * 60 * 1000,
      );
    }
  });

  it("throws generic error on non-429 failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
      }),
    );

    await expect(
      fetchOuraApi("/usercollection/sleep", "tok_abc"),
    ).rejects.toThrow("Oura API error: 500 Internal Server Error");
  });
});

// ─── importOuraSleep ──────────────────────────────────

// Mock the modules that importOuraSleep depends on internally
vi.mock("../src/lib/encryption", () => ({
  encryptToken: vi.fn((t: string) => `enc:${t}`),
  decryptToken: vi.fn((t: string) => t.replace("enc:", "")),
}));

describe("importOuraSleep", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeConnection(userId = "user-010") {
    return {
      id: "conn-1",
      userId,
      accessToken: "enc:tok_fresh",
      refreshToken: "enc:ref_tok",
      tokenExpiresAt: new Date(Date.now() + 3_600_000), // 1h future
    };
  }

  function makeDb() {
    return {
      sleepLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      deviceConnection: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
  }

  it("creates SleepLog for new entries and skips duplicates", async () => {
    const sleepDoc = makeSleepDoc();
    const duplicateDoc = makeSleepDoc({ id: "sleep-dup" });

    vi.stubGlobal(
      "fetch",
      vi.fn()
        // First call: sleep endpoint
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: [sleepDoc, duplicateDoc],
              next_token: null,
            }),
          headers: new Headers(),
        })
        // Second call: readiness endpoint (best-effort)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: [{ day: "2026-04-08", score: 80 }],
              next_token: null,
            }),
          headers: new Headers(),
        }),
    );

    const db = makeDb();
    // First entry is new, second is a duplicate
    db.sleepLog.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing" });

    const results = await importOuraSleep(
      makeConnection(),
      db,
      "2026-04-01",
      "2026-04-09",
    );

    // Only the first entry should be created
    expect(results).toHaveLength(1);
    expect(db.sleepLog.create).toHaveBeenCalledOnce();

    // Verify the created record has correct fields
    const createArg = db.sleepLog.create.mock.calls[0][0].data;
    expect(createArg.externalId).toBe("oura:sleep-abc-123");
    expect(createArg.source).toBe("oura");
    expect(createArg.durationMins).toBe(420);
    expect(createArg.score).toBe(80); // readiness score mapped
  });
});

// ─── importOuraReadiness ──────────────────────────────

describe("importOuraReadiness", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeConnection(userId = "user-020") {
    return {
      id: "conn-2",
      userId,
      accessToken: "enc:tok_fresh",
      refreshToken: "enc:ref_tok",
      tokenExpiresAt: new Date(Date.now() + 3_600_000),
    };
  }

  function makeDb() {
    return {
      bodyMetric: {
        upsert: vi.fn().mockImplementation(({ create }) =>
          Promise.resolve(create),
        ),
      },
      deviceConnection: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
  }

  it("upserts BodyMetric with readiness measurements", async () => {
    const readiness = makeReadiness();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ data: [readiness], next_token: null }),
        headers: new Headers(),
      }),
    );

    const db = makeDb();
    const conn = makeConnection();
    const results = await importOuraReadiness(conn, db, "2026-04-01", "2026-04-09");

    expect(results).toHaveLength(1);
    expect(db.bodyMetric.upsert).toHaveBeenCalledOnce();

    const upsertArg = db.bodyMetric.upsert.mock.calls[0][0];
    // where clause uses userId + date composite key
    expect(upsertArg.where.userId_date.userId).toBe("user-020");
    expect(upsertArg.where.userId_date.date).toEqual(new Date("2026-04-08"));
    // measurements stored in create
    expect(upsertArg.create.measurements.readinessScore).toBe(82);
    expect(upsertArg.create.measurements.hrvBalance).toBe(75);
    expect(upsertArg.create.measurements.restingHr).toBe(92);
    // update also carries measurements
    expect(upsertArg.update.measurements.readinessScore).toBe(82);
    expect(upsertArg.update.source).toBe("oura");
  });
});

// ─── runOuraBackfill ──────────────────────────────────

// We need to mock the import helpers since runOuraBackfill calls them internally.
// Instead we'll mock fetch to simulate end-to-end flow.
describe("runOuraBackfill", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeDb(connection: any) {
    return {
      deviceConnection: {
        findUnique: vi.fn().mockResolvedValue(connection),
        update: vi.fn().mockResolvedValue({}),
      },
      sleepLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      bodyMetric: {
        upsert: vi.fn().mockImplementation(({ create }) =>
          Promise.resolve(create),
        ),
      },
    };
  }

  it("fetches 30 days of sleep + readiness and updates lastSyncedAt", async () => {
    const connection = {
      id: "conn-backfill",
      userId: "user-030",
      accessToken: "enc:tok_bf",
      refreshToken: "enc:ref_bf",
      tokenExpiresAt: new Date(Date.now() + 3_600_000),
    };
    const db = makeDb(connection);

    // Mock fetch: sleep, readiness-for-sleep (best-effort), readiness
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [makeSleepDoc()], next_token: null }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: [{ day: "2026-04-08", score: 77 }],
              next_token: null,
            }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ data: [makeReadiness()], next_token: null }),
          headers: new Headers(),
        }),
    );

    await runOuraBackfill("conn-backfill", db);

    // Should have looked up the connection
    expect(db.deviceConnection.findUnique).toHaveBeenCalledWith({
      where: { id: "conn-backfill" },
    });

    // Should have created sleep log(s)
    expect(db.sleepLog.create).toHaveBeenCalled();

    // Should have upserted body metric(s)
    expect(db.bodyMetric.upsert).toHaveBeenCalled();

    // Must update lastSyncedAt at the end
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-backfill" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("does nothing when connection is not found", async () => {
    const db = makeDb(null);
    db.deviceConnection.findUnique.mockResolvedValue(null);

    await runOuraBackfill("conn-missing", db);

    expect(db.sleepLog.create).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });
});
