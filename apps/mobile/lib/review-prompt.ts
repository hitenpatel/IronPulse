import * as StoreReview from "@/lib/store-review";
import * as SecureStore from "@/lib/secure-store";
import { trpc } from "./trpc";

const REVIEW_LAST_SHOWN_KEY = "review_prompt_last_shown";
const REVIEW_MIN_WORKOUTS = 5;
const REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Checks whether the review prompt conditions are met and, if so, requests
 * a store review from the user.
 *
 * Conditions:
 *   1. The device / platform supports in-app review.
 *   2. The user has completed at least 5 workouts.
 *   3. The prompt has not been shown in the last 30 days.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    // 1. Platform support check
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    // 2. Cooldown check
    const lastShownStr = await SecureStore.getItemAsync(REVIEW_LAST_SHOWN_KEY);
    if (lastShownStr) {
      const lastShown = parseInt(lastShownStr, 10);
      if (Date.now() - lastShown < REVIEW_COOLDOWN_MS) return;
    }

    // 3. Workout count check — query the server
    // We use a paginated list query and cap at limit=1 to cheaply determine
    // whether at least REVIEW_MIN_WORKOUTS workouts exist. Since the API
    // doesn't expose a raw count endpoint we fetch a page with a high limit
    // and rely on the returned data length.
    const result = await trpc.workout.list.query({ limit: 100 });
    const completedCount = result.data.filter(
      (w: { completedAt: unknown }) => w.completedAt !== null
    ).length;

    if (completedCount < REVIEW_MIN_WORKOUTS) return;

    // All conditions met — request the review and record the timestamp
    await StoreReview.requestReview();
    await SecureStore.setItemAsync(
      REVIEW_LAST_SHOWN_KEY,
      String(Date.now())
    );
  } catch {
    // Never let review logic crash the app
  }
}
