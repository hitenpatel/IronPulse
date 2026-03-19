export interface ImportedSet {
  date: Date;
  workoutName: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

/**
 * Parse a single CSV line, handling quoted fields that may contain commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "") return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}

function toInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : n;
}

/**
 * Parse Strong CSV export.
 *
 * Header: Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
 * Date format: "2024-01-15 08:00:00"
 * Weight is in the user's chosen unit — Strong exports kg when the app is set to kg,
 * but there is no explicit unit column in the CSV, so we treat the column as-is (weight_kg).
 */
export function parseStrongCSV(csv: string): ImportedSet[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = {
    date: headers.indexOf("date"),
    workoutName: headers.indexOf("workout name"),
    exerciseName: headers.indexOf("exercise name"),
    setOrder: headers.indexOf("set order"),
    weight: headers.indexOf("weight"),
    reps: headers.indexOf("reps"),
    rpe: headers.indexOf("rpe"),
  };

  const sets: ImportedSet[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]!);
    const dateStr = idx.date >= 0 ? (cols[idx.date] ?? "") : "";
    const workoutName = idx.workoutName >= 0 ? (cols[idx.workoutName] ?? "") : "";
    const exerciseName = idx.exerciseName >= 0 ? (cols[idx.exerciseName] ?? "") : "";
    const setOrder = idx.setOrder >= 0 ? (cols[idx.setOrder] ?? "") : "";
    const weight = idx.weight >= 0 ? (cols[idx.weight] ?? "") : "";
    const reps = idx.reps >= 0 ? (cols[idx.reps] ?? "") : "";
    const rpe = idx.rpe >= 0 ? (cols[idx.rpe] ?? "") : "";

    if (!dateStr || !exerciseName) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    sets.push({
      date,
      workoutName: workoutName || "Imported Workout",
      exerciseName,
      setNumber: toInt(setOrder) ?? sets.length + 1,
      weightKg: toNumber(weight),
      reps: toInt(reps),
      rpe: toNumber(rpe),
    });
  }

  return sets;
}

/**
 * Parse Hevy CSV export.
 *
 * Header: title,start_time,end_time,exercise_title,superset_id,set_index,set_type,weight_kg,reps,distance_km,duration_s,rpe
 * Timestamps: ISO 8601 e.g. "2024-01-15T08:00:00"
 */
export function parseHevyCSV(csv: string): ImportedSet[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = {
    title: headers.indexOf("title"),
    startTime: headers.indexOf("start_time"),
    exerciseTitle: headers.indexOf("exercise_title"),
    setIndex: headers.indexOf("set_index"),
    weightKg: headers.indexOf("weight_kg"),
    reps: headers.indexOf("reps"),
    rpe: headers.indexOf("rpe"),
  };

  const sets: ImportedSet[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]!);
    const title = idx.title >= 0 ? (cols[idx.title] ?? "") : "";
    const startTime = idx.startTime >= 0 ? (cols[idx.startTime] ?? "") : "";
    const exerciseTitle = idx.exerciseTitle >= 0 ? (cols[idx.exerciseTitle] ?? "") : "";
    const setIndex = idx.setIndex >= 0 ? (cols[idx.setIndex] ?? "") : "";
    const weightKg = idx.weightKg >= 0 ? (cols[idx.weightKg] ?? "") : "";
    const reps = idx.reps >= 0 ? (cols[idx.reps] ?? "") : "";
    const rpe = idx.rpe >= 0 ? (cols[idx.rpe] ?? "") : "";

    if (!startTime || !exerciseTitle) continue;

    const date = new Date(startTime);
    if (isNaN(date.getTime())) continue;

    sets.push({
      date,
      workoutName: title || "Imported Workout",
      exerciseName: exerciseTitle,
      setNumber: toInt(setIndex) ?? sets.length + 1,
      weightKg: toNumber(weightKg),
      reps: toInt(reps),
      rpe: toNumber(rpe),
    });
  }

  return sets;
}

/**
 * Parse FitNotes CSV export.
 *
 * Header: Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time
 * Date format: "2024-01-15"
 * FitNotes has no workout name or set number — sets are grouped by date+exercise.
 */
export function parseFitNotesCSV(csv: string): ImportedSet[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = {
    date: headers.indexOf("date"),
    exercise: headers.indexOf("exercise"),
    weight: headers.findIndex((h) => h.startsWith("weight")),
    reps: headers.indexOf("reps"),
  };

  const sets: ImportedSet[] = [];
  // Track per-date+exercise set counts for auto-numbering
  const setCounters = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]!);
    const dateStr = idx.date >= 0 ? (cols[idx.date] ?? "") : "";
    const exerciseName = idx.exercise >= 0 ? (cols[idx.exercise] ?? "") : "";
    const weight = idx.weight >= 0 ? (cols[idx.weight] ?? "") : "";
    const reps = idx.reps >= 0 ? (cols[idx.reps] ?? "") : "";

    if (!dateStr || !exerciseName) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const dateKey = dateStr.trim();
    const key = `${dateKey}::${exerciseName}`;
    const currentCount = (setCounters.get(key) ?? 0) + 1;
    setCounters.set(key, currentCount);

    sets.push({
      date,
      workoutName: `Workout ${dateKey}`,
      exerciseName,
      setNumber: currentCount,
      weightKg: toNumber(weight),
      reps: toInt(reps),
      rpe: null,
    });
  }

  return sets;
}

export function detectFormat(csv: string): "strong" | "hevy" | "fitnotes" | "unknown" {
  const header = csv.split("\n")[0]?.toLowerCase() ?? "";
  if (header.includes("workout name") && header.includes("set order")) return "strong";
  if (header.includes("exercise_title") && header.includes("set_type")) return "hevy";
  if (header.includes("category") && header.includes("distance unit")) return "fitnotes";
  return "unknown";
}
