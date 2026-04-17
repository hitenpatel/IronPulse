import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Weekly summary settings", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("settings page shows weekly summary toggle", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/weekly summary email/i)).toBeVisible();
  });

  test("toggle preference persists across reload", async ({ page }) => {
    await page.goto("/settings");
    const toggle = page.getByLabel(/weekly summary email toggle/i);
    await expect(toggle).toBeVisible();

    // Get initial state
    const initial = await toggle.isChecked();
    // Flip it
    await toggle.click();
    await page.waitForTimeout(500);

    // Reload and verify new state
    await page.reload();
    await expect(toggle).toBeVisible();
    const afterReload = await page.getByLabel(/weekly summary email toggle/i).isChecked();
    expect(afterReload).toBe(!initial);

    // Reset
    await page.getByLabel(/weekly summary email toggle/i).click();
  });
});
