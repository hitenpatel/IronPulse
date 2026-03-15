interface DbExecutor {
  execute(sql: string, params?: any[]): Promise<any>;
}

interface BufferPoint {
  id: string;
  session_id: string;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  timestamp: string;
}

export async function initGpsBuffer(db: DbExecutor): Promise<void> {
  await db.execute(`CREATE TABLE IF NOT EXISTS _gps_buffer (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
    latitude REAL NOT NULL, longitude REAL NOT NULL,
    elevation_m REAL, timestamp TEXT NOT NULL
  )`);
}

export async function insertBufferPoint(db: DbExecutor, sessionId: string, coords: { latitude: number; longitude: number; altitude?: number | null }, timestamp: string): Promise<void> {
  const id = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.execute(
    `INSERT INTO _gps_buffer (id, session_id, latitude, longitude, elevation_m, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, sessionId, coords.latitude, coords.longitude, coords.altitude ?? null, timestamp]
  );
}

export async function getBufferPoints(db: DbExecutor, sessionId: string): Promise<BufferPoint[]> {
  const result = await db.execute(`SELECT * FROM _gps_buffer WHERE session_id = ? ORDER BY timestamp`, [sessionId]);
  return result.rows?._array ?? [];
}

export async function clearBuffer(db: DbExecutor, sessionId: string): Promise<void> {
  await db.execute(`DELETE FROM _gps_buffer WHERE session_id = ?`, [sessionId]);
}

export async function getActiveSessionId(db: DbExecutor): Promise<string | null> {
  const result = await db.execute(`SELECT DISTINCT session_id FROM _gps_buffer LIMIT 1`);
  return result.rows?._array?.[0]?.session_id ?? null;
}
