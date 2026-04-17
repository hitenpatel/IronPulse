import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows notification bell in sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    const bell = page.getByLabel(/^notifications/i).first();
    await expect(bell).toBeVisible();
  });

  test("notifications page loads with empty state or list", async ({ page }) => {
    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: /notifications/i, level: 1 })
    ).toBeVisible();
  });

  test("clicking bell navigates to notifications page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByLabel(/^notifications/i).first().click();
    await expect(page).toHaveURL(/\/notifications$/);
  });
});
