import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Workouts list page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("loads with Workouts heading", async ({ page }) => {
    await page.goto("/workouts");

    await expect(
      page.getByRole("heading", { name: "Workouts", level: 1 })
    ).toBeVisible();
  });

  test("shows empty state or workout cards after loading", async ({ page }) => {
    await page.goto("/workouts");

    // Wait for loading skeletons to disappear — heading is always present
    await expect(
      page.getByRole("heading", { name: "Workouts", level: 1 })
    ).toBeVisible();

    // Allow time for data to settle
    await page.waitForTimeout(1000);

    // Either a workout card link or the empty-state copy should be visible
    const workoutLink = page.locator('a[href^="/workouts/"]').first();
    const emptyText = page.getByText("No workouts yet");

    const hasWorkouts = await workoutLink.isVisible().catch(() => false);
    const isEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasWorkouts || isEmpty).toBe(true);
  });

  test("can navigate to workout detail if workouts exist", async ({ page }) => {
    await page.goto("/workouts");

    // Wait for potential loading to finish
    await page.waitForTimeout(1000);

    const firstWorkoutLink = page.locator('a[href^="/workouts/"]').first();
    const exists = await firstWorkoutLink.isVisible().catch(() => false);

    if (!exists) {
      // No workouts — nothing to navigate to; skip gracefully
      test.skip();
      return;
    }

    const href = await firstWorkoutLink.getAttribute("href");
    await firstWorkoutLink.click();

    await page.waitForURL(`**${href}`);

    // Verify we landed on the detail page (heading or "Back to Workouts" link)
    const backLink = page.getByRole("link", { name: /Workouts/i });
    await expect(backLink).toBeVisible();
  });

  test("shows Start Workout link in empty state", async ({ page }) => {
    await page.goto("/workouts");
    await page.waitForTimeout(1000);

    const emptyText = page.getByText("No workouts yet");
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      test.skip();
      return;
    }

    await expect(
      page.getByRole("link", { name: "Start Workout" })
    ).toBeVisible();
  });
});
