/**
 * Device-local storage for workout focus/rest state.
 *
 * Stores focus position and rest timer under:
 *   workout-session:{userId}:{workoutId}
 *
 * Uses AsyncStorage. Validates IDs and numeric deadlines before returning.
 * Favorites live under workout-favorites:{userId} (Task 5).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RestState } from "./workout-rest-state";

const SCHEMA_VERSION = 1;

export interface PersistedSessionState {
  schemaVersion: number;
  focusedSetId: string | null;
  progressionAnchorId: string | null;
  restState: RestState;
}

function sessionKey(userId: string, workoutId: string): string {
  return `workout-session:${userId}:${workoutId}`;
}

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

function isValidRestState(s: unknown): s is RestState {
  if (typeof s !== "object" || s == null) return false;
  const status = (s as Record<string, unknown>).status;
  if (status === "idle") return true;
  if (status === "running") {
    const d = (s as Record<string, unknown>).deadlineMs;
    return typeof d === "number" && isFinite(d);
  }
  if (status === "paused") {
    const r = (s as Record<string, unknown>).remainingSeconds;
    return typeof r === "number" && isFinite(r) && r >= 0;
  }
  return false;
}

/**
 * Load persisted session state. Returns null if missing, invalid, or wrong user/workout.
 */
export async function loadSessionState(
  userId: string,
  workoutId: string,
): Promise<PersistedSessionState | null> {
  if (!isValidId(userId) || !isValidId(workoutId)) return null;

  try {
    const raw = await AsyncStorage.getItem(sessionKey(userId, workoutId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed == null ||
      parsed.schemaVersion !== SCHEMA_VERSION
    ) return null;

    return {
      schemaVersion: SCHEMA_VERSION,
      focusedSetId: isValidId(parsed.focusedSetId) ? parsed.focusedSetId : null,
      progressionAnchorId: isValidId(parsed.progressionAnchorId)
        ? parsed.progressionAnchorId
        : null,
      restState: isValidRestState(parsed.restState)
        ? parsed.restState
        : { status: "idle" },
    };
  } catch {
    return null;
  }
}

/**
 * Persist session state. No-ops if IDs are invalid.
 */
export async function saveSessionState(
  userId: string,
  workoutId: string,
  state: Omit<PersistedSessionState, "schemaVersion">,
): Promise<void> {
  if (!isValidId(userId) || !isValidId(workoutId)) return;
  const toStore: PersistedSessionState = { schemaVersion: SCHEMA_VERSION, ...state };
  try {
    await AsyncStorage.setItem(sessionKey(userId, workoutId), JSON.stringify(toStore));
  } catch {
    // Storage failure is non-fatal; focus re-derives from DB on next mount
  }
}

/**
 * Clear persisted session state (call on finish or discard).
 */
export async function clearSessionState(
  userId: string,
  workoutId: string,
): Promise<void> {
  if (!isValidId(userId) || !isValidId(workoutId)) return;
  try {
    await AsyncStorage.removeItem(sessionKey(userId, workoutId));
  } catch {
    // ignore
  }
}
