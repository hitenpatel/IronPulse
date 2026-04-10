import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapWithingsMeasures,
  fetchWithingsApi,
  refreshWithingsToken,
  importWithingsMeasures,
  runWithingsBackfill,
  WithingsApiError,
  WithingsMeasureType,
  type WithingsMeasureGroup,
} from "../src/lib/withings";

// ─── mapWithingsMeasures ──────────────────────────────

describe("mapWithingsMeasures", () => {
  it("converts weight (type 1) using value * 10^unit", () => {
    const group: WithingsMeasureGroup = {
      grpid: 100,
      date: 1710000000,
      category: 1,
      measures: [{ type: WithingsMeasureType.WEIGHT_KG, value: 75000, unit: -3 }],
    };
    const result = mapWithingsMeasures(group);
    expect(result.weightKg).toBe(75.0);
    expect(result.bodyFatPct).toBeNull();
  });

  it("converts fat percentage (type 8)", () => {
    const group: WithingsMeasureGroup = {
      grpid: 101,
      date: 1710000000,
      category: 1,
      measures: [{ type: WithingsMeasureType.FAT_PCT, value: 1825, unit: -2 }],
    };
    const result = mapWithingsMeasures(group);
    expect(result.bodyFatPct).toBe(18.3); // 18.25 rounded to 1 decimal
    expect(result.weightKg).toBeNull();
  });

  it("extracts multiple measure types from a single group", () => {
    const group: WithingsMeasureGroup = {
      grpid: 102,
      date: 1710000000,
      category: 1,
      measures: [
        { type: WithingsMeasureType.WEIGHT_KG, value: 8230, unit: -2 },
        { type: WithingsMeasureType.FAT_PCT, value: 215, unit: -1 },
        { type: WithingsMeasureType.FAT_MASS_KG, value: 17650, unit: -3 },
        { type: WithingsMeasureType.MUSCLE_MASS_KG, value: 35200, unit: -3 },
        { type: WithingsMeasureType.BONE_MASS_KG, value: 3100, unit: -3 },
        { type: WithingsMeasureType.HYDRATION_PCT, value: 552, unit: -1 },
        { type: WithingsMeasureType.SYSTOLIC_BP, value: 120, unit: 0 },
        { type: WithingsMeasureType.DIASTOLIC_BP, value: 80, unit: 0 },
      ],
    };
    const result = mapWithingsMeasures(group);
    expect(result.weightKg).toBe(82.3);
    expect(result.bodyFatPct).toBe(21.5);
    expect(result.measurements.fatMassKg).toBe(17.65);
    expect(result.measurements.muscleMassKg).toBe(35.2);
    expect(result.measurements.boneMassKg).toBe(3.1);
    expect(result.measurements.hydrationPct).toBe(55.2);
    expect(result.measurements.systolicBp).toBe(120);
    expect(result.measurements.diastolicBp).toBe(80);
  });

  it("returns nulls when no weight or fat measures exist", () => {
    const group: WithingsMeasureGroup = {
      grpid: 103,
      date: 1710000000,
      category: 1,
      measures: [{ type: WithingsMeasureType.BONE_MASS_KG, value: 3100, unit: -3 }],
    };
    const result = mapWithingsMeasures(group);
    expect(result.weightKg).toBeNull();
    expect(result.bodyFatPct).toBeNull();
    expect(result.measurements.boneMassKg).toBe(3.1);
  });
});

// ─── fetchWithingsApi ─────────────────────────────────

describe("fetchWithingsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed body on success (status=0)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 0,
          body: { measuregrps: [{ grpid: 1 }] },
        }),
      }),
    );

    const result = await fetchWithingsApi<{
      status: number;
      body: { measuregrps: { grpid: number }[] };
    }>("/measure", "tok_123", { action: "getmeas" });

    expect(result.body.measuregrps).toHaveLength(1);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("throws WithingsApiError when inner status != 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 401, body: {} }),
      }),
    );

    await expect(
      fetchWithingsApi("/measure", "tok_bad", { action: "getmeas" }),
    ).rejects.toThrow(WithingsApiError);

    await expect(
      fetchWithingsApi("/measure", "tok_bad", { action: "getmeas" }),
    ).rejects.toThrow("Withings API returned status 401");
  });

  it("throws WithingsApiError on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(
      fetchWithingsApi("/measure", "tok_err", { action: "getmeas" }),
    ).rejects.toThrow(WithingsApiError);

    await expect(
      fetchWithingsApi("/measure", "tok_err", { action: "getmeas" }),
    ).rejects.toThrow("Withings API error: 500 Internal Server Error");
  });
});

// ─── refreshWithingsToken ─────────────────────────────

describe("refreshWithingsToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("WITHINGS_CLIENT_ID", "test_client_id");
    vi.stubEnv("WITHINGS_CLIENT_SECRET", "test_client_secret");
  });

  it("sends form-encoded POST with action=requesttoken and returns tokens", async () => {
    const tokenBody = {
      access_token: "new_access",
      refresh_token: "new_refresh",
      expires_in: 10800,
      userid: 42,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 0, body: tokenBody }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await refreshWithingsToken("old_refresh");

    expect(result.access_token).toBe("new_access");
    expect(result.refresh_token).toBe("new_refresh");
    expect(result.expires_in).toBe(10800);
    expect(result.userid).toBe(42);

    // Verify the request was form-encoded with correct params
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://wbsapi.withings.net/v2/oauth2");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    const sentBody = new URLSearchParams(opts.body);
    expect(sentBody.get("action")).toBe("requesttoken");
    expect(sentBody.get("grant_type")).toBe("refresh_token");
    expect(sentBody.get("refresh_token")).toBe("old_refresh");
    expect(sentBody.get("client_id")).toBe("test_client_id");
    expect(sentBody.get("client_secret")).toBe("test_client_secret");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    await expect(refreshWithingsToken("old")).rejects.toThrow(
      "Withings token refresh failed: 502 Bad Gateway",
    );
  });

  it("throws when Withings returns non-zero status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 293, body: {} }),
      }),
    );

    await expect(refreshWithingsToken("old")).rejects.toThrow(
      "Withings token refresh returned status 293",
    );
  });
});

// ─── importWithingsMeasures ───────────────────────────

describe("importWithingsMeasures", () => {
  function makeDb() {
    return {
      bodyMetric: {
        findFirst: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
  }

  it("imports weight and bodyFat, upserts by userId+date", async () => {
    const db = makeDb();
    const groups: WithingsMeasureGroup[] = [
      {
        grpid: 200,
        date: 1710000000, // 2024-03-09T…
        category: 1,
        measures: [
          { type: WithingsMeasureType.WEIGHT_KG, value: 75000, unit: -3 },
          { type: WithingsMeasureType.FAT_PCT, value: 182, unit: -1 },
        ],
      },
    ];

    const count = await importWithingsMeasures(groups, "user-1", db);

    expect(count).toBe(1);
    expect(db.bodyMetric.upsert).toHaveBeenCalledOnce();

    const call = db.bodyMetric.upsert.mock.calls[0][0];
    expect(call.where.userId_date.userId).toBe("user-1");
    expect(call.create.weightKg).toBe(75.0);
    expect(call.create.bodyFatPct).toBe(18.2);
    expect(call.create.source).toBe("withings");
    expect(call.create.externalId).toBe("withings:200");
  });

  it("skips groups already imported (dedup by externalId)", async () => {
    const db = makeDb();
    db.bodyMetric.findFirst.mockResolvedValue({ id: "existing" });

    const groups: WithingsMeasureGroup[] = [
      {
        grpid: 300,
        date: 1710000000,
        category: 1,
        measures: [
          { type: WithingsMeasureType.WEIGHT_KG, value: 70000, unit: -3 },
        ],
      },
    ];

    const count = await importWithingsMeasures(groups, "user-1", db);
    expect(count).toBe(0);
    expect(db.bodyMetric.upsert).not.toHaveBeenCalled();
  });

  it("skips user-objective groups (category 2)", async () => {
    const db = makeDb();
    const groups: WithingsMeasureGroup[] = [
      {
        grpid: 400,
        date: 1710000000,
        category: 2,
        measures: [
          { type: WithingsMeasureType.WEIGHT_KG, value: 70000, unit: -3 },
        ],
      },
    ];

    const count = await importWithingsMeasures(groups, "user-1", db);
    expect(count).toBe(0);
    expect(db.bodyMetric.upsert).not.toHaveBeenCalled();
  });

  it("skips groups with no weight or bodyFat", async () => {
    const db = makeDb();
    const groups: WithingsMeasureGroup[] = [
      {
        grpid: 500,
        date: 1710000000,
        category: 1,
        measures: [
          { type: WithingsMeasureType.BONE_MASS_KG, value: 3100, unit: -3 },
        ],
      },
    ];

    const count = await importWithingsMeasures(groups, "user-1", db);
    expect(count).toBe(0);
    expect(db.bodyMetric.upsert).not.toHaveBeenCalled();
  });

  it("includes extra measurements in the upsert payload", async () => {
    const db = makeDb();
    const groups: WithingsMeasureGroup[] = [
      {
        grpid: 600,
        date: 1710000000,
        category: 1,
        measures: [
          { type: WithingsMeasureType.WEIGHT_KG, value: 80000, unit: -3 },
          { type: WithingsMeasureType.MUSCLE_MASS_KG, value: 35000, unit: -3 },
          { type: WithingsMeasureType.HYDRATION_PCT, value: 550, unit: -1 },
        ],
      },
    ];

    await importWithingsMeasures(groups, "user-1", db);

    const call = db.bodyMetric.upsert.mock.calls[0][0];
    expect(call.create.measurements).toEqual({
      muscleMassKg: 35.0,
      hydrationPct: 55.0,
    });
    expect(call.update.measurements).toEqual({
      muscleMassKg: 35.0,
      hydrationPct: 55.0,
    });
  });
});

// ─── runWithingsBackfill ──────────────────────────────

describe("runWithingsBackfill", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches 30 days of measures and updates lastSyncedAt", async () => {
    // Mock encryption module so ensureWithingsFreshToken works
    vi.mock("../src/lib/encryption", () => ({
      encryptToken: (t: string) => `enc:${t}`,
      decryptToken: (t: string) => t.replace("enc:", ""),
    }));

    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockUpsert = vi.fn().mockResolvedValue({});

    const db = {
      deviceConnection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conn-1",
          userId: "user-1",
          accessToken: "enc:access_tok",
          refreshToken: "enc:refresh_tok",
          tokenExpiresAt: new Date(Date.now() + 3600_000), // not expired
        }),
        update: mockUpdate,
      },
      bodyMetric: {
        findFirst: mockFindFirst,
        upsert: mockUpsert,
      },
    };

    // Mock the Withings API response
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 0,
          body: {
            updatetime: 1710000000,
            more: 0,
            offset: 0,
            measuregrps: [
              {
                grpid: 900,
                date: 1710000000,
                category: 1,
                measures: [
                  { type: 1, value: 75000, unit: -3 },
                ],
              },
            ],
          },
        }),
      }),
    );

    await runWithingsBackfill("conn-1", db);

    // Verify fetch was called with 30-day range params
    const [url, opts] = (fetch as any).mock.calls[0];
    expect(url).toContain("/measure");
    const sentBody = new URLSearchParams(opts.body);
    expect(sentBody.get("action")).toBe("getmeas");
    const startdate = Number(sentBody.get("startdate"));
    const enddate = Number(sentBody.get("enddate"));
    // enddate - startdate should be ~30 days (2592000 seconds)
    expect(enddate - startdate).toBe(30 * 24 * 60 * 60);

    // Verify measures were imported
    expect(mockUpsert).toHaveBeenCalledOnce();

    // Verify lastSyncedAt was updated
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conn-1" },
        data: expect.objectContaining({
          lastSyncedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns early when connection not found", async () => {
    const db = {
      deviceConnection: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      bodyMetric: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
    };

    await runWithingsBackfill("missing-conn", db);

    expect(db.deviceConnection.update).not.toHaveBeenCalled();
    expect(db.bodyMetric.upsert).not.toHaveBeenCalled();
  });
});
