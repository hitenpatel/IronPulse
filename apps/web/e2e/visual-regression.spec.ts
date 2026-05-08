import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Visual regression", () => {
  // No baseline screenshots committed yet. Playwright treats a missing baseline
  // as a failure ("1 snapshot(s) generated — please commit them"), causing every
  // CI run to fail. Skip until baselines are committed; run locally with
  // `--update-snapshots` to generate and commit them.
  test.skip(!!process.env.CI, "No baseline snapshots committed to repository");

  test("login page matches snapshot", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveScreenshot("login.png");
  });

  test.describe("authenticated pages", () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page);
    });

    test("dashboard matches snapshot", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("dashboard.png");
    });

    test("workouts list matches snapshot", async ({ page }) => {
      await page.goto("/workouts");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("workouts.png");
    });

    test("feed matches snapshot", async ({ page }) => {
      await page.goto("/feed");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("feed.png");
    });

    test("stats matches snapshot", async ({ page }) => {
      await page.goto("/stats");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("stats.png");
    });

    test("pricing matches snapshot", async ({ page }) => {
      await page.goto("/pricing");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("pricing.png");
    });
  });
});
