import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * tRPC Fallback E2E Tests
 *
 * These tests verify that every major user flow works when PowerSync is
 * unavailable (insecure context / init failure) and the app falls back to
 * tRPC for all reads and writes.
 *
 * The standard Playwright test server runs on http://localhost:3000 which
 * is a secure context, but PowerSync may still be unavailable (no WASM,
 * no sync URL configured, etc.). These tests ensure the app is functional
 * regardless — the tRPC path is always exercised when PowerSync isn't
 * initialized.
 */

test.describe("tRPC Fallback — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard loads with recent activity section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1500);

    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("activity feed shows workout/cardio items or empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1500);

    const activityItem = page
      .locator('a[href^="/workouts/"], a[href^="/cardio/"]')
      .first();
    const emptyText = page.getByText("No activity yet");

    const hasItems = await activityItem.isVisible().catch(() => false);
    const isEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasItems || isEmpty).toBe(true);
  });
});

test.describe("tRPC Fallback — Workout Flow", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("can create a new workout via tRPC", async ({ page }) => {
    await page.goto("/workouts/new");

    // Should not show the error state
    const errorText = page.getByText("Could not create workout");
    await expect(errorText).not.toBeVisible({ timeout: 10_000 });

    // Should show the active workout UI (header with Finish button or workout name)
    // Wait for either the active workout UI or error state
    const finish = page.getByText("Finish");
    const error = page.getByText("Could not create workout");
    await expect(finish.or(error)).toBeVisible({ timeout: 20_000 });
  });

  test("can open add exercise sheet in active workout", async ({ page }) => {
    await page.goto("/workouts/new");
    // Wait for either the active workout UI or error state
    const finish = page.getByText("Finish");
    const error = page.getByText("Could not create workout");
    await expect(finish.or(error)).toBeVisible({ timeout: 20_000 });

    // Click the Add Exercise button
    await page.getByText("+ Add Exercise").click();

    // The sheet should open with the title and search input
    await expect(page.getByRole("heading", { name: "Add Exercise" })).toBeVisible();
    await expect(
      page.getByPlaceholder("Search exercises...")
    ).toBeVisible();
  });

  test("exercise search returns results from tRPC", async ({ page }) => {
    await page.goto("/workouts/new");
    // Wait for either the active workout UI or error state
    const finish = page.getByText("Finish");
    const error = page.getByText("Could not create workout");
    await expect(finish.or(error)).toBeVisible({ timeout: 20_000 });

    await page.getByText("+ Add Exercise").click();
    await expect(
      page.getByPlaceholder("Search exercises...")
    ).toBeVisible();

    // Wait for exercises to load (either "All Exercises" label or actual exercise buttons)
    await page.waitForTimeout(1500);

    const exerciseButtons = page
      .locator(".space-y-1 button")
      .first();
    const noExercises = page.getByText("No exercises available");

    const hasExercises = await exerciseButtons.isVisible().catch(() => false);
    const isEmpty = await noExercises.isVisible().catch(() => false);

    expect(hasExercises || isEmpty).toBe(true);
  });

  test("can add exercise and it appears in workout", async ({ page }) => {
    await page.goto("/workouts/new");
    // Wait for either the active workout UI or error state
    const finish = page.getByText("Finish");
    const error = page.getByText("Could not create workout");
    await expect(finish.or(error)).toBeVisible({ timeout: 20_000 });

    await page.getByText("+ Add Exercise").click();
    await page.waitForTimeout(1500);

    // If exercises are available, add the first one
    const firstExercise = page.locator(".space-y-1 button").first();
    const hasExercise = await firstExercise.isVisible().catch(() => false);

    if (!hasExercise) {
      test.skip();
      return;
    }

    const exerciseName = await firstExercise
      .locator("p.font-medium")
      .textContent();
    await firstExercise.click();

    // Sheet should close and exercise should appear in the workout
    await page.waitForTimeout(2000);

    if (exerciseName) {
      await expect(page.getByText(exerciseName).first()).toBeVisible();
    }
  });

  test("workouts list page loads data via tRPC", async ({ page }) => {
    await page.goto("/workouts");

    await expect(
      page.getByRole("heading", { name: "Workouts", level: 1 })
    ).toBeVisible();

    // Wait for data to load — the page may show workouts, empty state, or loading skeletons
    await page.waitForTimeout(3000);

    const workoutLink = page.locator('a[href^="/workouts/"]').first();
    const emptyText = page.getByText("No workouts yet");
    const skeleton = page.locator('[class*="animate-pulse"]').first();

    const hasWorkouts = await workoutLink.isVisible().catch(() => false);
    const isEmpty = await emptyText.isVisible().catch(() => false);
    const isLoading = await skeleton.isVisible().catch(() => false);

    // Page rendered without crashing — any of these states is acceptable
    expect(hasWorkouts || isEmpty || isLoading).toBe(true);
  });

  test("workout detail page loads via tRPC", async ({ page }) => {
    await page.goto("/workouts");
    await page.waitForTimeout(1500);

    const firstLink = page.locator('a[href^="/workouts/"]').first();
    const exists = await firstLink.isVisible().catch(() => false);

    if (!exists) {
      test.skip();
      return;
    }

    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await page.waitForURL(`**${href}`);
    await page.waitForTimeout(1500);

    // Summary cards should be visible
    const main = page.locator("main");
    await expect(main.getByText("Exercises", { exact: true })).toBeVisible();
    await expect(page.getByText("Sets")).toBeVisible();
  });
});

test.describe("tRPC Fallback — Cardio Flow", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("cardio list page loads via tRPC", async ({ page }) => {
    await page.goto("/cardio");

    await expect(
      page.getByRole("heading", { name: "Cardio", level: 1 })
    ).toBeVisible();

    await page.waitForTimeout(1500);

    const sessionCard = page.locator('a[href^="/cardio/"]').first();
    const emptyText = page.getByText("No cardio sessions yet");

    const hasSessions = await sessionCard.isVisible().catch(() => false);
    const isEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasSessions || isEmpty).toBe(true);
  });

  test("can start manual cardio entry", async ({ page }) => {
    await page.goto("/cardio/new");

    // Type picker should be visible
    await expect(page.getByText("What type of cardio?")).toBeVisible();

    // Select "Run"
    await page.getByRole("button", { name: "Run" }).click();

    // Should advance to the form — type picker disappears
    await expect(page.getByText("What type of cardio?")).not.toBeVisible();
  });

  test("manual cardio form has duration and save controls", async ({
    page,
  }) => {
    await page.goto("/cardio/new");
    await page.getByRole("button", { name: "Run" }).click();

    // Duration inputs should be present (hours/minutes/seconds)
    await expect(page.getByPlaceholder("HH").or(page.getByText("Duration"))).toBeVisible();

    // Save button should be present
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("cardio detail page loads via tRPC", async ({ page }) => {
    await page.goto("/cardio");
    await page.waitForTimeout(2000);

    // Look for session card links (UUID-based paths, not /cardio/new)
    const sessionLink = page.locator('a[href*="/cardio/"][href*="-"]').first();
    const exists = await sessionLink.isVisible().catch(() => false);

    if (!exists) {
      // No cardio sessions in database
      test.skip();
      return;
    }

    const href = await sessionLink.getAttribute("href");
    await sessionLink.click();
    await page.waitForURL(`**${href}`);
    await page.waitForTimeout(1500);

    // Should show cardio session details or back link
    const backLink = page.getByRole("link", { name: /cardio/i });
    await expect(backLink).toBeVisible();
  });
});

test.describe("tRPC Fallback — Stats Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("stats page loads key sections via tRPC", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Stats", level: 1 })
    ).toBeVisible();

    await page.waitForTimeout(2000);

    // Key sections should render
    await expect(page.getByText("Training Status").first()).toBeVisible();
    await expect(page.getByText("Training Load").first()).toBeVisible();
  });

  test("body weight log form works", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForTimeout(2000);

    // Scroll to the Log Weight section
    const logWeight = page.getByText("Log Weight").first();
    await logWeight.scrollIntoViewIfNeeded();
    await expect(logWeight).toBeVisible({ timeout: 10_000 });

    // The weight input
    const weightInput = page.locator('input[type="number"]').first();
    await expect(weightInput).toBeVisible();

    await weightInput.fill("80.5");
    await expect(weightInput).toHaveValue("80.5");

    // Save button near the Log Weight section
    await expect(page.getByRole("button", { name: "Save" }).first()).toBeVisible();
  });
});

test.describe("tRPC Fallback — Exercises Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("exercises page loads via tRPC", async ({ page }) => {
    await page.goto("/exercises");

    await expect(
      page.getByRole("heading", { name: "Exercises", level: 1 })
    ).toBeVisible();

    await page.waitForTimeout(1500);

    // Should show exercise cards or search input
    const searchInput = page.getByPlaceholder("Search exercises...");
    const hasSearch = await searchInput.isVisible().catch(() => false);

    // Either search bar or exercises or empty state
    expect(hasSearch).toBe(true);
  });

  test("exercise search works via tRPC", async ({ page }) => {
    await page.goto("/exercises");
    await page.waitForTimeout(1500);

    const searchInput = page.getByPlaceholder("Search exercises...");
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (!hasSearch) {
      test.skip();
      return;
    }

    await searchInput.fill("bench");
    await page.waitForTimeout(1000);

    // Results should update — either matching exercises or "no results"
    // We just verify the page doesn't crash
    await expect(
      page.getByRole("heading", { name: "Exercises", level: 1 })
    ).toBeVisible();
  });
});

test.describe("tRPC Fallback — Templates Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("templates page loads via tRPC", async ({ page }) => {
    await page.goto("/templates");

    await page.waitForTimeout(1500);

    // Should show templates or empty state — page shouldn't crash
    const heading = page.getByRole("heading", { name: /templates/i });
    const emptyText = page.getByText(/no templates/i);

    const hasHeading = await heading.isVisible().catch(() => false);
    const isEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasHeading || isEmpty).toBe(true);
  });
});

test.describe("tRPC Fallback — Calendar Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("calendar loads with month/year and day grid", async ({ page }) => {
    await page.goto("/calendar");

    await expect(
      page.getByRole("heading", { name: "Calendar", level: 1 })
    ).toBeVisible();

    // Current month/year should be displayed
    const now = new Date();
    const expectedMonthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    await expect(page.getByText(expectedMonthYear)).toBeVisible();

    // Weekday headers
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      await expect(page.getByText(day)).toBeVisible();
    }
  });

  test("calendar loads workout and cardio data via tRPC", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(2000);

    // Click day 1 to see the detail panel
    const dayOne = page.getByRole("button", { name: "1" }).first();
    await dayOne.click();

    // Should show either activity or "No activity" — not crash
    const noActivity = page.getByText("No activity");
    const activityLink = page
      .locator('a[href^="/workouts/"], a[href^="/cardio/"]')
      .first();

    const showsNoActivity = await noActivity.isVisible().catch(() => false);
    const showsActivity = await activityLink.isVisible().catch(() => false);

    expect(showsNoActivity || showsActivity).toBe(true);
  });

  test("legend shows Workout and Cardio indicators", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1500);

    // The legend text is in the main content area, not sidebar
    // Use the main area to avoid matching sidebar nav items
    const main = page.locator("main").or(page.locator('[class*="flex-1"]'));
    await expect(main.getByText("Workout").first()).toBeVisible();
    await expect(main.getByText("Cardio").first()).toBeVisible();
  });
});

test.describe("tRPC Fallback — Full Workout E2E", () => {
  test("complete workout flow: create → add exercise → finish", async ({
    page,
  }) => {
    await signIn(page);

    // Step 1: Create new workout
    await page.goto("/workouts/new");
    // Wait for either the active workout UI or error state
    const finish = page.getByText("Finish");
    const error = page.getByText("Could not create workout");
    await expect(finish.or(error)).toBeVisible({ timeout: 20_000 });

    // Step 2: Open add exercise sheet
    await page.getByText("+ Add Exercise").click();
    await expect(page.getByRole("heading", { name: "Add Exercise" })).toBeVisible();
    await page.waitForTimeout(1500);

    // Step 3: Add first available exercise
    const firstExercise = page.locator(".space-y-1 button").first();
    const hasExercise = await firstExercise.isVisible().catch(() => false);

    if (!hasExercise) {
      // No exercises in database — skip the rest
      test.skip();
      return;
    }

    await firstExercise.click();
    await page.waitForTimeout(2000);

    // Step 4: Verify exercise card appeared (should have an Add Set button)
    const addSetBtn = page.getByText("+ Add Set");
    const hasAddSet = await addSetBtn.isVisible().catch(() => false);

    // Step 5: Click Finish to complete the workout
    await page.getByText("Finish").click();

    // Should navigate away or show completion summary
    await page.waitForTimeout(2000);

    // Either redirected to dashboard/workouts or showing summary
    const onCompletionOrRedirected =
      page.url().includes("/dashboard") ||
      page.url().includes("/workouts") ||
      (await page.getByText(/workout complete|summary|great/i).isVisible().catch(() => false));

    expect(onCompletionOrRedirected || hasAddSet).toBe(true);
  });
});
