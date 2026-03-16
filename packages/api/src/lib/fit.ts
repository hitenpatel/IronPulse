import FitParser from "fit-file-parser";

// --- Type mapping ---

const SPORT_MAP: Record<string, string> = {
  running: "run",
  trail_running: "run",
  treadmill_running: "run",
  cycling: "cycle",
  mountain_biking: "cycle",
  indoor_cycling: "cycle",
  swimming: "swim",
  open_water_swimming: "swim",
  pool_swimming: "swim",
  hiking: "hike",
  walking: "walk",
};

export function mapFitActivityType(sport: string): string {
  return SPORT_MAP[sport] ?? "other";
}

// --- Data extraction ---

export interface FitPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  heartRate: number | null;
  timestamp: Date;
}

export interface FitData {
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  elevationGainM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  points: FitPoint[];
}

interface FitSession {
  sport: string;
  start_time: Date;
  total_elapsed_time: number;
  total_distance?: number;
  total_ascent?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  total_calories?: number;
}

interface FitRecord {
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  heart_rate?: number;
  timestamp?: Date;
}

interface ParsedFit {
  sessions: FitSession[];
  records: FitRecord[];
}

export function extractFitData(parsed: ParsedFit): FitData {
  const session = parsed.sessions[0]!;

  const points: FitPoint[] = parsed.records
    .filter(
      (r) =>
        r.position_lat != null &&
        r.position_long != null &&
        r.timestamp != null
    )
    .map((r) => ({
      latitude: r.position_lat!,
      longitude: r.position_long!,
      altitude: r.altitude ?? null,
      heartRate: r.heart_rate ?? null,
      timestamp: r.timestamp!,
    }));

  return {
    type: mapFitActivityType(session.sport),
    startedAt: session.start_time,
    durationSeconds: session.total_elapsed_time,
    distanceMeters: session.total_distance ?? null,
    elevationGainM: session.total_ascent ?? null,
    avgHeartRate: session.avg_heart_rate ?? null,
    maxHeartRate: session.max_heart_rate ?? null,
    calories: session.total_calories ?? null,
    points,
  };
}

// --- FIT file parsing ---

export async function parseFitFile(buffer: Buffer): Promise<FitData> {
  const parser = new FitParser({ force: true });
  const parsed = await parser.parseAsync(buffer);
  return extractFitData(parsed as unknown as ParsedFit);
}
