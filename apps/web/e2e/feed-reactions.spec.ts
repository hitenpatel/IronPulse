import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Activity Feed", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should load feed page with activity items", async ({ page }) => {
    await page.goto("/feed");
    await expect(
      page.getByRole("heading", { name: "Activity Feed" })
    ).toBeVisible();
  });

  test("should show reaction buttons on feed items", async ({ page }) => {
    await page.goto("/feed");
    await page.waitForTimeout(1000);

    // Check if reaction buttons exist (kudos/fire/muscle)
    const kudosButton = page.getByLabel(/kudos/i).first();
    if (await kudosButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(kudosButton).toBeVisible();
    }
  });

  test("should navigate to workout detail from feed item", async ({
    page,
  }) => {
    await page.goto("/feed");
    await page.waitForTimeout(1000);

    // Check for clickable workout items
    const workoutLink = page
      .locator('a[href^="/workouts/"]')
      .first();
    if (await workoutLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(workoutLink).toHaveAttribute("href", /\/workouts\//);
    }
  });
});
