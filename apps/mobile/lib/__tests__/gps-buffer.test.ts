import { describe, it, expect, vi } from "vitest";
import {
  initGpsBuffer,
  insertBufferPoint,
  getBufferPoints,
  clearBuffer,
  getActiveSessionId,
} from "../gps-buffer";

function makeDb(rows: unknown[] = []) {
  return {
    execute: vi.fn().mockResolvedValue({ rows: { _array: rows } }),
  };
}

describe("initGpsBuffer", () => {
  it("executes a CREATE TABLE statement", async () => {
    const db = makeDb();
    await initGpsBuffer(db);
    expect(db.execute).toHaveBeenCalledOnce();
    expect(db.execute.mock.calls[0][0]).toMatch(/CREATE TABLE IF NOT EXISTS _gps_buffer/i);
  });
});

describe("insertBufferPoint", () => {
  it("inserts a row with the correct session, coords, and timestamp", async () => {
    const db = makeDb();
    await insertBufferPoint(
      db,
      "sess-1",
      { latitude: 51.5, longitude: -0.1, altitude: 15.5 },
      "2026-04-29T10:00:00Z",
    );
    expect(db.execute).toHaveBeenCalledOnce();
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO _gps_buffer/i);
    expect(params[1]).toBe("sess-1");
    expect(params[2]).toBe(51.5);
    expect(params[3]).toBe(-0.1);
    expect(params[4]).toBe(15.5);
    expect(params[5]).toBe("2026-04-29T10:00:00Z");
  });

  it("stores null when altitude is undefined", async () => {
    const db = makeDb();
    await insertBufferPoint(db, "sess-1", { latitude: 0, longitude: 0 }, "t");
    const params = db.execute.mock.calls[0][1];
    expect(params[4]).toBeNull();
  });

  it("stores null when altitude is explicitly null", async () => {
    const db = makeDb();
    await insertBufferPoint(db, "sess-1", { latitude: 0, longitude: 0, altitude: null }, "t");
    const params = db.execute.mock.calls[0][1];
    expect(params[4]).toBeNull();
  });
});

describe("getBufferPoints", () => {
  it("returns the _array rows for the given session", async () => {
    const fakeRows = [
      { id: "r1", session_id: "sess-1", latitude: 51.5, longitude: -0.1, elevation_m: null, timestamp: "t1" },
    ];
    const db = makeDb(fakeRows);
    const result = await getBufferPoints(db, "sess-1");
    expect(result).toEqual(fakeRows);
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toMatch(/SELECT \* FROM _gps_buffer WHERE session_id/i);
    expect(params[0]).toBe("sess-1");
  });

  it("returns an empty array when no rows exist", async () => {
    const db = makeDb([]);
    const result = await getBufferPoints(db, "sess-none");
    expect(result).toEqual([]);
  });
});

describe("clearBuffer", () => {
  it("executes a DELETE for the given session", async () => {
    const db = makeDb();
    await clearBuffer(db, "sess-1");
    expect(db.execute).toHaveBeenCalledOnce();
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM _gps_buffer WHERE session_id/i);
    expect(params[0]).toBe("sess-1");
  });
});

describe("getActiveSessionId", () => {
  it("returns the session_id from the first row", async () => {
    const db = makeDb([{ session_id: "sess-active" }]);
    const result = await getActiveSessionId(db);
    expect(result).toBe("sess-active");
  });

  it("returns null when the buffer is empty", async () => {
    const db = makeDb([]);
    const result = await getActiveSessionId(db);
    expect(result).toBeNull();
  });
});
