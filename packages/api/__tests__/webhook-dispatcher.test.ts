import { describe, expect, it, vi, beforeEach } from "vitest";

const importers = vi.hoisted(() => ({
  importStravaActivity: vi.fn(),
  importGarminActivity: vi.fn(),
  importOuraSleep: vi.fn(),
  importOuraReadiness: vi.fn(),
  importWithingsMeasures: vi.fn(),
  importPolarActivity: vi.fn(),
  ensureWithingsFreshToken: vi.fn(),
  fetchWithingsApi: vi.fn(),
}));

vi.mock("../src/lib/strava", () => ({ importStravaActivity: importers.importStravaActivity }));
vi.mock("../src/lib/garmin", () => ({ importGarminActivity: importers.importGarminActivity }));
vi.mock("../src/lib/oura", () => ({ importOuraSleep: importers.importOuraSleep, importOuraReadiness: importers.importOuraReadiness }));
vi.mock("../src/lib/withings", () => ({
  importWithingsMeasures: importers.importWithingsMeasures,
  ensureWithingsFreshToken: importers.ensureWithingsFreshToken,
  fetchWithingsApi: importers.fetchWithingsApi,
}));
vi.mock("../src/lib/polar", () => ({ importPolarActivity: importers.importPolarActivity }));

import { dispatchWebhookEvent } from "../src/lib/webhook-dispatcher";

function fakeDb(connectionByLookup: Array<{ where: any; result: any }>) {
  const findFirst = vi.fn(async ({ where }: any) => {
    const m = connectionByLookup.find(
      (c) => c.where.provider === where.provider && c.where.providerAccountId === where.providerAccountId,
    );
    return m?.result ?? null;
  });
  const update = vi.fn(async () => ({}));
  return { deviceConnection: { findFirst, update } } as any;
}

beforeEach(() => {
  Object.values(importers).forEach((m) => (m as any).mockReset?.());
});

// ---------- Strava ----------

describe("dispatchWebhookEvent — strava", () => {
  const payload = { object_type: "activity", aspect_type: "create", object_id: 42, owner_id: 7 };

  it("returns skipped_no_connection when no connection exists", async () => {
    const db = fakeDb([]);
    const result = await dispatchWebhookEvent({ provider: "strava", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importStravaActivity).not.toHaveBeenCalled();
  });

  it("returns skipped_no_connection when connection has syncEnabled=false", async () => {
    const db = fakeDb([
      { where: { provider: "strava", providerAccountId: "7" }, result: { id: "conn1", userId: "u1", syncEnabled: false } },
    ]);
    const result = await dispatchWebhookEvent({ provider: "strava", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importStravaActivity).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("dispatches to importStravaActivity and marks lastSyncedAt on happy path", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "strava", providerAccountId: "7" }, result: conn }]);
    importers.importStravaActivity.mockResolvedValue({ id: "session1" });

    const result = await dispatchWebhookEvent({ provider: "strava", payload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.importStravaActivity).toHaveBeenCalledWith(42, conn, db);
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("propagates an error thrown by importStravaActivity", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "strava", providerAccountId: "7" }, result: conn }]);
    importers.importStravaActivity.mockRejectedValue(new Error("strava api down"));

    await expect(dispatchWebhookEvent({ provider: "strava", payload, db })).rejects.toThrow("strava api down");
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });
});

// ---------- Garmin ----------

describe("dispatchWebhookEvent — garmin", () => {
  it("returns skipped_no_connection when no connection exists for the activity's user", async () => {
    const db = fakeDb([]);
    const payload = { activityDetails: [{ userId: "u1", activityId: 1 }] };
    const result = await dispatchWebhookEvent({ provider: "garmin", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importGarminActivity).not.toHaveBeenCalled();
  });

  it("returns skipped_no_connection when the only connection has syncEnabled=false", async () => {
    const db = fakeDb([
      { where: { provider: "garmin", providerAccountId: "u1" }, result: { id: "conn1", userId: "u1", syncEnabled: false } },
    ]);
    const payload = { activityDetails: [{ userId: "u1", activityId: 1 }] };
    const result = await dispatchWebhookEvent({ provider: "garmin", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importGarminActivity).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("dispatches to importGarminActivity and marks lastSyncedAt on happy path", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "garmin", providerAccountId: "u1" }, result: conn }]);
    importers.importGarminActivity.mockResolvedValue({ id: "session1" });
    const payload = { activityDetails: [{ userId: "u1", activityId: 1 }] };

    const result = await dispatchWebhookEvent({ provider: "garmin", payload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.importGarminActivity).toHaveBeenCalledWith(1, conn, db);
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("propagates an error thrown by importGarminActivity", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "garmin", providerAccountId: "u1" }, result: conn }]);
    importers.importGarminActivity.mockRejectedValue(new Error("garmin api down"));
    const payload = { activityDetails: [{ userId: "u1", activityId: 1 }] };

    await expect(dispatchWebhookEvent({ provider: "garmin", payload, db })).rejects.toThrow("garmin api down");
  });

  it("mixed batch: dispatches only the activity with a live connection and still succeeds", async () => {
    const connU1 = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "garmin", providerAccountId: "u1" }, result: connU1 }]);
    importers.importGarminActivity.mockResolvedValue({ id: "session1" });
    const payload = {
      activityDetails: [
        { userId: "u1", activityId: 1 },
        { userId: "u2", activityId: 2 },
      ],
    };

    const result = await dispatchWebhookEvent({ provider: "garmin", payload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.importGarminActivity).toHaveBeenCalledTimes(1);
    expect(importers.importGarminActivity).toHaveBeenCalledWith(1, connU1, db);
    expect(db.deviceConnection.update).toHaveBeenCalledTimes(1);
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });
});

// ---------- Oura ----------

describe("dispatchWebhookEvent — oura", () => {
  const sleepPayload = { event_type: "create", data_type: "sleep", user_id: "u1", event_date: "2026-09-06" };

  it("returns skipped_no_connection when no connection exists", async () => {
    const db = fakeDb([]);
    const result = await dispatchWebhookEvent({ provider: "oura", payload: sleepPayload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importOuraSleep).not.toHaveBeenCalled();
  });

  it("returns skipped_no_connection when connection has syncEnabled=false", async () => {
    const db = fakeDb([
      { where: { provider: "oura", providerAccountId: "u1" }, result: { id: "conn1", userId: "u1", syncEnabled: false } },
    ]);
    const result = await dispatchWebhookEvent({ provider: "oura", payload: sleepPayload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importOuraSleep).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("dispatches sleep events to importOuraSleep and marks lastSyncedAt on happy path", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "oura", providerAccountId: "u1" }, result: conn }]);
    importers.importOuraSleep.mockResolvedValue([{ id: "sleep1" }]);

    const result = await dispatchWebhookEvent({ provider: "oura", payload: sleepPayload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.importOuraSleep).toHaveBeenCalledWith(conn, db, "2026-09-06", "2026-09-06");
    expect(importers.importOuraReadiness).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("propagates an error thrown by importOuraSleep", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "oura", providerAccountId: "u1" }, result: conn }]);
    importers.importOuraSleep.mockRejectedValue(new Error("oura api down"));

    await expect(dispatchWebhookEvent({ provider: "oura", payload: sleepPayload, db })).rejects.toThrow("oura api down");
  });

  it("dispatches daily_readiness events to importOuraReadiness on happy path", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "oura", providerAccountId: "u1" }, result: conn }]);
    importers.importOuraReadiness.mockResolvedValue([{ id: "metric1" }]);
    const readinessPayload = { event_type: "create", data_type: "daily_readiness", user_id: "u1", event_date: "2026-09-06" };

    const result = await dispatchWebhookEvent({ provider: "oura", payload: readinessPayload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.importOuraReadiness).toHaveBeenCalledWith(conn, db, "2026-09-06", "2026-09-06");
    expect(importers.importOuraSleep).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("returns skipped_no_connection for an unrecognized data_type even with a live connection", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "oura", providerAccountId: "u1" }, result: conn }]);
    const unknownPayload = { event_type: "create", data_type: "activity", user_id: "u1", event_date: "2026-09-06" };

    const result = await dispatchWebhookEvent({ provider: "oura", payload: unknownPayload, db });

    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importOuraSleep).not.toHaveBeenCalled();
    expect(importers.importOuraReadiness).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });
});

// ---------- Withings ----------

describe("dispatchWebhookEvent — withings", () => {
  const payload = { userid: "u1", appli: 1, startdate: 1000, enddate: 2000 };

  it("returns skipped_no_connection when no connection exists", async () => {
    const db = fakeDb([]);
    const result = await dispatchWebhookEvent({ provider: "withings", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.ensureWithingsFreshToken).not.toHaveBeenCalled();
  });

  it("returns skipped_no_connection when connection has syncEnabled=false", async () => {
    const db = fakeDb([
      { where: { provider: "withings", providerAccountId: "u1" }, result: { id: "conn1", userId: "u1", syncEnabled: false } },
    ]);
    const result = await dispatchWebhookEvent({ provider: "withings", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.ensureWithingsFreshToken).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("fetches fresh measures and dispatches to importWithingsMeasures on happy path", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "withings", providerAccountId: "u1" }, result: conn }]);
    const measuregrps = [{ grpid: 1, date: 1700000000, measures: [], category: 1 }];
    importers.ensureWithingsFreshToken.mockResolvedValue("access-token-123");
    importers.fetchWithingsApi.mockResolvedValue({ status: 0, body: { measuregrps } });
    importers.importWithingsMeasures.mockResolvedValue(1);

    const result = await dispatchWebhookEvent({ provider: "withings", payload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.ensureWithingsFreshToken).toHaveBeenCalledWith(conn, db);
    expect(importers.fetchWithingsApi).toHaveBeenCalledWith("/measure", "access-token-123", {
      action: "getmeas",
      meastype: "1,6,8,76,88,77,10,9",
      startdate: 1000,
      enddate: 2000,
    });
    expect(importers.importWithingsMeasures).toHaveBeenCalledWith(measuregrps, conn.userId, db);
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("propagates an error thrown by importWithingsMeasures", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "withings", providerAccountId: "u1" }, result: conn }]);
    importers.ensureWithingsFreshToken.mockResolvedValue("access-token-123");
    importers.fetchWithingsApi.mockResolvedValue({ status: 0, body: { measuregrps: [] } });
    importers.importWithingsMeasures.mockRejectedValue(new Error("db write failed"));

    await expect(dispatchWebhookEvent({ provider: "withings", payload, db })).rejects.toThrow("db write failed");
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("propagates an error thrown by fetchWithingsApi without calling importWithingsMeasures", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "withings", providerAccountId: "u1" }, result: conn }]);
    importers.ensureWithingsFreshToken.mockResolvedValue("access-token-123");
    importers.fetchWithingsApi.mockRejectedValue(new Error("withings api down"));

    await expect(dispatchWebhookEvent({ provider: "withings", payload, db })).rejects.toThrow("withings api down");
    expect(importers.importWithingsMeasures).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });
});

// ---------- Polar ----------

describe("dispatchWebhookEvent — polar", () => {
  const payload = {
    event: "EXERCISE",
    user_id: "u1",
    entity_id: "ex123",
    timestamp: "2026-09-06T00:00:00Z",
    url: "https://www.polaraccesslink.com/v3/exercises/ex123",
  };

  it("returns skipped_no_connection when no connection exists", async () => {
    const db = fakeDb([]);
    const result = await dispatchWebhookEvent({ provider: "polar", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importPolarActivity).not.toHaveBeenCalled();
  });

  it("returns skipped_no_connection when connection has syncEnabled=false", async () => {
    const db = fakeDb([
      { where: { provider: "polar", providerAccountId: "u1" }, result: { id: "conn1", userId: "u1", syncEnabled: false } },
    ]);
    const result = await dispatchWebhookEvent({ provider: "polar", payload, db });
    expect(result).toEqual({ kind: "skipped_no_connection" });
    expect(importers.importPolarActivity).not.toHaveBeenCalled();
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });

  it("dispatches to importPolarActivity and marks lastSyncedAt on happy path", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "polar", providerAccountId: "u1" }, result: conn }]);
    importers.importPolarActivity.mockResolvedValue({ id: "session1" });

    const result = await dispatchWebhookEvent({ provider: "polar", payload, db });

    expect(result).toEqual({ kind: "succeeded" });
    expect(importers.importPolarActivity).toHaveBeenCalledWith("ex123", conn, db);
    expect(db.deviceConnection.update).toHaveBeenCalledWith({
      where: { id: "conn1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it("propagates an error thrown by importPolarActivity", async () => {
    const conn = { id: "conn1", userId: "u1", syncEnabled: true };
    const db = fakeDb([{ where: { provider: "polar", providerAccountId: "u1" }, result: conn }]);
    importers.importPolarActivity.mockRejectedValue(new Error("polar api down"));

    await expect(dispatchWebhookEvent({ provider: "polar", payload, db })).rejects.toThrow("polar api down");
    expect(db.deviceConnection.update).not.toHaveBeenCalled();
  });
});
