import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapIntervalsType,
  mapIntervalsActivity,
  mapIntervalsWellness,
  fetchIntervalsApi,
  IntervalsApiError,
  importIntervalsActivity,
  importIntervalsWellness,
  runIntervalsBackfill,
  type IntervalsActivity,
  type IntervalsWellness,
} from "../src/lib/intervals-icu";

// ─── mapIntervalsType ──────────────────────────────────

describe("mapIntervalsType", () => {
  it("maps Run to run", () => expect(mapIntervalsType("Run")).toBe("run"));
  it("maps VirtualRun to run", () =>
    expect(mapIntervalsType("VirtualRun")).toBe("run"));
  it("maps Ride to cycle", () =>
    expect(mapIntervalsType("Ride")).toBe("cycle"));
  it("maps VirtualRide to cycle", () =>
    expect(mapIntervalsType("VirtualRide")).toBe("cycle"));
  it("maps Swim to swim", () =>
    expect(mapIntervalsType("Swim")).toBe("swim"));
  it("maps Walk to walk", () =>
    expect(mapIntervalsType("Walk")).toBe("walk"));
  it("maps Hike to hike", () =>
    expect(mapIntervalsType("Hike")).toBe("hike"));
  it("maps Row to row", () => expect(mapIntervalsType("Row")).toBe("row"));
  it("maps unknown to other", () =>
    expect(mapIntervalsType("Yoga")).toBe("other"));
});

// ─── mapIntervalsActivity ──────────────────────────────

describe("mapIntervalsActivity", () => {
  const fullActivity: IntervalsActivity = {
    id: 42,
    start_date_local: "2026-03-15T10:00:00",
    type: "Run",
    moving_time: 1800,
    distance: 5000,
    total_elevation_gain: 50,
    average_heartrate: 150,
    max_heartrate: 175,
    calories: 400,
    name: "Morning run",
  };

  it("sets externalId as intervals_icu:{id}", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.externalId).toBe("intervals_icu:42");
  });

  it("sets source to intervals_icu", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.source).toBe("intervals_icu");
  });

  it("maps type via mapIntervalsType", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.type).toBe("run");
  });

  it("maps all numeric fields", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
    expect(result.elevationGainM).toBe(50);
    expect(result.avgHeartRate).toBe(150);
    expect(result.maxHeartRate).toBe(175);
    expect(result.calories).toBe(400);
  });

  it("maps startedAt as Date", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.startedAt.toISOString()).toContain("2026-03-15");
  });

  it("maps notes from name", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.notes).toBe("Morning run");
  });

  it("sets userId", () => {
    const result = mapIntervalsActivity(fullActivity, "user-1");
    expect(result.userId).toBe("user-1");
  });

  it("handles missing optional fields", () => {
    const minimal: IntervalsActivity = {
      id: 99,
      start_date_local: "2026-03-15T10:00:00",
      type: "Swim",
      moving_time: 600,
      distance: 500,
    };
    const result = mapIntervalsActivity(minimal, "user-1");
    expect(result.elevationGainM).toBeUndefined();
    expect(result.avgHeartRate).toBeUndefined();
    expect(result.maxHeartRate).toBeUndefined();
    expect(result.calories).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });
});

// ─── mapIntervalsWellness ──────────────────────────────

describe("mapIntervalsWellness", () => {
  const fullWellness: IntervalsWellness = {
    id: "w1",
    day: "2026-03-15",
    weight: 75.5,
    restingHR: 55,
    hrv: 42,
    sleepSecs: 28800,
    sleepScore: 85,
    fatigue: 30,
    mood: 4,
    readiness: 70,
  };

  it("returns bodyMetric with weightKg", () => {
    const { bodyMetric } = mapIntervalsWellness(fullWellness, "user-1");
    expect(bodyMetric).not.toBeNull();
    expect(bodyMetric!.weightKg).toBe(75.5);
  });

  it("returns bodyMetric with correct externalId and source", () => {
    const { bodyMetric } = mapIntervalsWellness(fullWellness, "user-1");
    expect(bodyMetric!.externalId).toBe("intervals_icu:wellness:2026-03-15");
    expect(bodyMetric!.source).toBe("intervals_icu");
  });

  it("includes hrv, restingHR, fatigue, mood, readiness in measurements", () => {
    const { bodyMetric } = mapIntervalsWellness(fullWellness, "user-1");
    const m = bodyMetric!.measurements as Record<string, number>;
    expect(m.hrv).toBe(42);
    expect(m.restingHR).toBe(55);
    expect(m.fatigue).toBe(30);
    expect(m.mood).toBe(4);
    expect(m.readiness).toBe(70);
  });

  it("omits undefined fields from measurements", () => {
    const partial: IntervalsWellness = {
      id: "w2",
      day: "2026-03-15",
      weight: 70,
    };
    const { bodyMetric } = mapIntervalsWellness(partial, "user-1");
    expect(bodyMetric!.measurements).toEqual({});
  });

  it("returns null bodyMetric when no weight/hrv/restingHR", () => {
    const sleepOnly: IntervalsWellness = {
      id: "w3",
      day: "2026-03-15",
      sleepSecs: 25200,
      sleepScore: 70,
    };
    const { bodyMetric } = mapIntervalsWellness(sleepOnly, "user-1");
    expect(bodyMetric).toBeNull();
  });

  it("maps sleepLog with durationMins from sleepSecs", () => {
    const { sleepLog } = mapIntervalsWellness(fullWellness, "user-1");
    expect(sleepLog).not.toBeNull();
    expect(sleepLog!.durationMins).toBe(480); // 28800 / 60
  });

  it("maps sleepLog externalId and source", () => {
    const { sleepLog } = mapIntervalsWellness(fullWellness, "user-1");
    expect(sleepLog!.externalId).toBe("intervals_icu:sleep:2026-03-15");
    expect(sleepLog!.source).toBe("intervals_icu");
  });

  it("maps sleepLog score", () => {
    const { sleepLog } = mapIntervalsWellness(fullWellness, "user-1");
    expect(sleepLog!.score).toBe(85);
  });

  it("derives quality 'excellent' for score >= 80", () => {
    const { sleepLog } = mapIntervalsWellness(
      { ...fullWellness, sleepScore: 80 },
      "user-1",
    );
    expect(sleepLog!.quality).toBe("excellent");
  });

  it("derives quality 'good' for score >= 60", () => {
    const { sleepLog } = mapIntervalsWellness(
      { ...fullWellness, sleepScore: 65 },
      "user-1",
    );
    expect(sleepLog!.quality).toBe("good");
  });

  it("derives quality 'fair' for score >= 40", () => {
    const { sleepLog } = mapIntervalsWellness(
      { ...fullWellness, sleepScore: 45 },
      "user-1",
    );
    expect(sleepLog!.quality).toBe("fair");
  });

  it("derives quality 'poor' for score < 40", () => {
    const { sleepLog } = mapIntervalsWellness(
      { ...fullWellness, sleepScore: 20 },
      "user-1",
    );
    expect(sleepLog!.quality).toBe("poor");
  });

  it("derives quality null when no score", () => {
    const { sleepLog } = mapIntervalsWellness(
      { ...fullWellness, sleepScore: undefined },
      "user-1",
    );
    expect(sleepLog!.quality).toBeNull();
  });

  it("returns null sleepLog when no sleepSecs", () => {
    const noSleep: IntervalsWellness = {
      id: "w4",
      day: "2026-03-15",
      weight: 70,
    };
    const { sleepLog } = mapIntervalsWellness(noSleep, "user-1");
    expect(sleepLog).toBeNull();
  });
});

// ─── fetchIntervalsApi ─────────────────────────────────

describe("fetchIntervalsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Basic auth with API_KEY:{key} base64 encoded", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await fetchIntervalsApi("/test", "my-secret-key");

    const expected = Buffer.from("API_KEY:my-secret-key").toString("base64");
    const call = spy.mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${expected}`);
  });

  it("throws IntervalsApiError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    await expect(fetchIntervalsApi("/test", "bad-key")).rejects.toThrow(
      IntervalsApiError,
    );
    await expect(fetchIntervalsApi("/test", "bad-key")).rejects.toThrow(
      /authentication failed/,
    );
  });

  it("throws IntervalsApiError on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Too Many Requests", { status: 429 }),
    );

    await expect(fetchIntervalsApi("/test", "key")).rejects.toThrow(
      IntervalsApiError,
    );
    await expect(fetchIntervalsApi("/test", "key")).rejects.toThrow(
      /rate limit/,
    );
  });

  it("returns parsed JSON on success", async () => {
    const data = [{ id: 1, name: "Test" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 }),
    );

    const result = await fetchIntervalsApi("/test", "key");
    expect(result).toEqual(data);
  });

  it("passes query params to URL", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await fetchIntervalsApi("/test", "key", { oldest: "2026-01-01", newest: "2026-01-31" });

    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.searchParams.get("oldest")).toBe("2026-01-01");
    expect(url.searchParams.get("newest")).toBe("2026-01-31");
  });
});

// ─── importIntervalsActivity ───────────────────────────

describe("importIntervalsActivity", () => {
  const activity: IntervalsActivity = {
    id: 42,
    start_date_local: "2026-03-15T10:00:00",
    type: "Run",
    moving_time: 1800,
    distance: 5000,
  };

  function mockDb(overrides: Record<string, any> = {}) {
    return {
      cardioSession: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        ...overrides,
      },
    };
  }

  it("creates CardioSession with correct fields", async () => {
    const db = mockDb();
    const result = await importIntervalsActivity(activity, "user-1", db);

    expect(result).not.toBeNull();
    expect(db.cardioSession.create).toHaveBeenCalledTimes(1);

    const data = db.cardioSession.create.mock.calls[0][0].data;
    expect(data.externalId).toBe("intervals_icu:42");
    expect(data.type).toBe("run");
    expect(data.source).toBe("intervals_icu");
    expect(data.userId).toBe("user-1");
    expect(data.durationSeconds).toBe(1800);
    expect(data.distanceMeters).toBe(5000);
    expect(data.id).toBeDefined(); // UUID generated
  });

  it("deduplicates by intervals_icu externalId", async () => {
    const db = mockDb({
      findFirst: vi.fn().mockResolvedValue({ id: "existing" }),
    });

    const result = await importIntervalsActivity(activity, "user-1", db);

    expect(result).toBeNull();
    expect(db.cardioSession.create).not.toHaveBeenCalled();
  });

  it("deduplicates against strava/garmin cross-source IDs", async () => {
    const db = mockDb({
      findFirst: vi
        .fn()
        // First call: no intervals_icu match
        .mockResolvedValueOnce(null)
        // Second call: found strava match
        .mockResolvedValueOnce({ id: "strava-dup" }),
    });

    const result = await importIntervalsActivity(activity, "user-1", db);

    expect(result).toBeNull();
    expect(db.cardioSession.create).not.toHaveBeenCalled();

    // Verify the cross-source query checks strava and garmin
    const crossQuery = db.cardioSession.findFirst.mock.calls[1][0].where;
    expect(crossQuery.OR).toEqual([
      { externalId: "strava:42" },
      { externalId: "garmin:42" },
    ]);
  });
});

// ─── importIntervalsWellness ───────────────────────────

describe("importIntervalsWellness", () => {
  const wellness: IntervalsWellness = {
    id: "w1",
    day: "2026-03-15",
    weight: 75,
    restingHR: 55,
    hrv: 42,
    sleepSecs: 28800,
    sleepScore: 85,
  };

  function mockDb() {
    return {
      bodyMetric: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      sleepLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
  }

  it("creates bodyMetric when new", async () => {
    const db = mockDb();
    await importIntervalsWellness(wellness, "user-1", db);

    expect(db.bodyMetric.create).toHaveBeenCalledTimes(1);
    const data = db.bodyMetric.create.mock.calls[0][0].data;
    expect(data.weightKg).toBe(75);
    expect(data.source).toBe("intervals_icu");
    expect(data.externalId).toBe("intervals_icu:wellness:2026-03-15");
  });

  it("updates bodyMetric when externalId already exists", async () => {
    const db = mockDb();
    db.bodyMetric.findFirst.mockResolvedValue({ id: "existing-bm" });

    await importIntervalsWellness(wellness, "user-1", db);

    expect(db.bodyMetric.update).toHaveBeenCalledTimes(1);
    expect(db.bodyMetric.create).not.toHaveBeenCalled();
    expect(db.bodyMetric.update.mock.calls[0][0].where.id).toBe("existing-bm");
  });

  it("merges into existing manual entry for same day", async () => {
    const db = mockDb();
    db.bodyMetric.findFirst.mockResolvedValue(null); // no externalId match
    db.bodyMetric.findUnique.mockResolvedValue({
      id: "manual-entry",
      weightKg: 74,
      measurements: { notes: "manual" },
    });

    await importIntervalsWellness(wellness, "user-1", db);

    expect(db.bodyMetric.update).toHaveBeenCalledTimes(1);
    const updateData = db.bodyMetric.update.mock.calls[0][0].data;
    expect(updateData.source).toBe("intervals_icu");
    expect(updateData.weightKg).toBe(75);
    // Preserves existing measurements
    expect(updateData.measurements.notes).toBe("manual");
    expect(updateData.measurements.hrv).toBe(42);
  });

  it("creates sleepLog when new", async () => {
    const db = mockDb();
    await importIntervalsWellness(wellness, "user-1", db);

    expect(db.sleepLog.create).toHaveBeenCalledTimes(1);
    const data = db.sleepLog.create.mock.calls[0][0].data;
    expect(data.durationMins).toBe(480);
    expect(data.score).toBe(85);
    expect(data.quality).toBe("excellent");
    expect(data.source).toBe("intervals_icu");
  });

  it("updates sleepLog when externalId already exists", async () => {
    const db = mockDb();
    db.sleepLog.findFirst.mockResolvedValue({ id: "existing-sleep" });

    await importIntervalsWellness(wellness, "user-1", db);

    expect(db.sleepLog.update).toHaveBeenCalledTimes(1);
    expect(db.sleepLog.create).not.toHaveBeenCalled();
    expect(db.sleepLog.update.mock.calls[0][0].where.id).toBe("existing-sleep");
  });

  it("skips bodyMetric when no weight/hrv/restingHR", async () => {
    const db = mockDb();
    const sleepOnly: IntervalsWellness = {
      id: "w2",
      day: "2026-03-15",
      sleepSecs: 25200,
      sleepScore: 70,
    };

    await importIntervalsWellness(sleepOnly, "user-1", db);

    expect(db.bodyMetric.create).not.toHaveBeenCalled();
    expect(db.bodyMetric.update).not.toHaveBeenCalled();
    expect(db.sleepLog.create).toHaveBeenCalledTimes(1);
  });

  it("skips sleepLog when no sleepSecs", async () => {
    const db = mockDb();
    const weightOnly: IntervalsWellness = {
      id: "w3",
      day: "2026-03-15",
      weight: 70,
    };

    await importIntervalsWellness(weightOnly, "user-1", db);

    expect(db.sleepLog.create).not.toHaveBeenCalled();
    expect(db.sleepLog.update).not.toHaveBeenCalled();
    expect(db.bodyMetric.create).toHaveBeenCalledTimes(1);
  });
});

// ─── runIntervalsBackfill ──────────────────────────────

vi.mock("../src/lib/encryption", () => ({
  decryptToken: vi.fn((token: string) => `decrypted:${token}`),
}));

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

describe("runIntervalsBackfill", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Re-mock fetch for each test
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/activities")) {
        return new Response(
          JSON.stringify([
            {
              id: 1,
              start_date_local: "2026-03-15T10:00:00",
              type: "Run",
              moving_time: 1800,
              distance: 5000,
            },
          ]),
          { status: 200 },
        );
      }
      if (urlStr.includes("/wellness")) {
        return new Response(
          JSON.stringify([
            {
              id: "w1",
              day: "2026-03-15",
              weight: 75,
              sleepSecs: 28800,
              sleepScore: 85,
            },
          ]),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });
  });

  function mockDb() {
    return {
      deviceConnection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conn-1",
          userId: "user-1",
          accessToken: "encrypted-key",
          providerAccountId: "athlete-123",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      cardioSession: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      bodyMetric: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        update: vi.fn(),
      },
      sleepLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        update: vi.fn(),
      },
    };
  }

  it("returns early if connection not found", async () => {
    const db = mockDb();
    db.deviceConnection.findUnique.mockResolvedValue(null);

    await runIntervalsBackfill("missing-conn", db);

    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("decrypts stored API key and fetches activities + wellness", async () => {
    const db = mockDb();
    const { decryptToken } = await import("../src/lib/encryption");

    await runIntervalsBackfill("conn-1", db);

    expect(decryptToken).toHaveBeenCalledWith("encrypted-key");
    // fetch called for both activities and wellness
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("imports activities and creates CardioSession", async () => {
    const db = mockDb();

    await runIntervalsBackfill("conn-1", db);

    expect(db.cardioSession.create).toHaveBeenCalledTimes(1);
    const data = db.cardioSession.create.mock.calls[0][0].data;
    expect(data.externalId).toBe("intervals_icu:1");
    expect(data.source).toBe("intervals_icu");
  });

  it("imports wellness and creates bodyMetric + sleepLog", async () => {
    const db = mockDb();

    await runIntervalsBackfill("conn-1", db);

    expect(db.bodyMetric.create).toHaveBeenCalledTimes(1);
    expect(db.sleepLog.create).toHaveBeenCalledTimes(1);
  });

  it("updates lastSyncedAt on the connection", async () => {
    const db = mockDb();

    await runIntervalsBackfill("conn-1", db);

    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("continues processing when a single activity import fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/activities")) {
        return new Response(
          JSON.stringify([
            { id: 1, start_date_local: "2026-03-15T10:00:00", type: "Run", moving_time: 1800, distance: 5000 },
            { id: 2, start_date_local: "2026-03-16T10:00:00", type: "Ride", moving_time: 3600, distance: 30000 },
          ]),
          { status: 200 },
        );
      }
      if (urlStr.includes("/wellness")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    const db = mockDb();
    db.cardioSession.create
      .mockRejectedValueOnce(new Error("DB error"))
      .mockImplementation(({ data }: any) => Promise.resolve(data));

    await runIntervalsBackfill("conn-1", db);

    // Second activity should still be attempted
    expect(db.cardioSession.create).toHaveBeenCalledTimes(2);
    // lastSyncedAt still updated despite partial failure
    expect(db.deviceConnection.update).toHaveBeenCalled();
  });

  it("fetches 30 days of data using correct date range", async () => {
    const db = mockDb();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await runIntervalsBackfill("conn-1", db);

    // Both calls should have oldest and newest params
    for (const call of spy.mock.calls) {
      const url = new URL(call[0] as string);
      const oldest = url.searchParams.get("oldest");
      const newest = url.searchParams.get("newest");
      expect(oldest).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(newest).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // newest should be >= oldest
      expect(newest! >= oldest!).toBe(true);
    }
  });
});
