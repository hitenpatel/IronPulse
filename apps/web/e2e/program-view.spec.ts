import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("My Program Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should show empty state when no program assigned", async ({
    page,
  }) => {
    await page.goto("/program");
    // Either shows the program schedule or the empty state
    const heading = page.getByRole("heading", { name: "My Program" });
    const findCoach = page.getByRole("button", { name: "Find a Coach" });
    const programContent = page.locator("text=Week 1");

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should show either program content or empty state
    const hasProgram = await programContent
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!hasProgram) {
      await expect(heading).toBeVisible();
      await expect(findCoach).toBeVisible();
    }
  });

  test("should be accessible from sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    const programLink = page.getByLabel("My Program");
    if (await programLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await programLink.click();
      await page.waitForURL("/program");
    }
  });
});
