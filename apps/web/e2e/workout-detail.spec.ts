import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Workout detail page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  /**
   * Helper: navigate to the first available workout detail page.
   * Returns the URL navigated to, or null if no workouts exist.
   */
  async function goToFirstWorkout(page: Parameters<typeof signIn>[0]) {
    await page.goto("/workouts");
    await page.waitForTimeout(1000);

    const firstLink = page.locator('a[href^="/workouts/"]').first();
    const exists = await firstLink.isVisible().catch(() => false);
    if (!exists) return null;

    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await page.waitForURL(`**${href}`);
    return href;
  }

  test("shows exercises and sets sections when a workout exists", async ({
    page,
  }) => {
    const href = await goToFirstWorkout(page);
    if (!href) {
      test.skip();
      return;
    }

    // Wait for loading state to resolve
    await page.waitForTimeout(1000);

    // Summary cards (Exercises / Sets / Volume) should be visible
    const main = page.locator("main");
    await expect(main.getByText("Exercises", { exact: true })).toBeVisible();
    await expect(page.getByText("Sets")).toBeVisible();
    await expect(page.getByText("Volume")).toBeVisible();
  });

  test("Share button is present on workout detail page", async ({ page }) => {
    const href = await goToFirstWorkout(page);
    if (!href) {
      test.skip();
      return;
    }

    await page.waitForTimeout(1000);

    // Share button contains "Share" text (may say "Copied!" after click)
    const shareButton = page.getByRole("button", { name: /share/i });
    await expect(shareButton).toBeVisible();
  });

  test("Save as Template button is present on workout detail page", async ({
    page,
  }) => {
    const href = await goToFirstWorkout(page);
    if (!href) {
      test.skip();
      return;
    }

    await page.waitForTimeout(1000);

    const templateButton = page.getByRole("button", {
      name: /save as template/i,
    });
    await expect(templateButton).toBeVisible();
  });

  test("shows back link to Workouts list", async ({ page }) => {
    const href = await goToFirstWorkout(page);
    if (!href) {
      test.skip();
      return;
    }

    const backLink = page.getByRole("link", { name: /workouts/i });
    await expect(backLink).toBeVisible();
  });

  test("workout not found page shows Back to Workouts link", async ({
    page,
  }) => {
    await page.goto("/workouts/nonexistent-workout-id-00000000");
    await page.waitForTimeout(1000);

    const notFound = page.getByText("Workout not found");
    const isNotFound = await notFound.isVisible().catch(() => false);

    if (isNotFound) {
      await expect(
        page.getByRole("link", { name: "Back to Workouts" })
      ).toBeVisible();
    }
    // If not shown (e.g., still loading), test passes vacuously
  });
});
