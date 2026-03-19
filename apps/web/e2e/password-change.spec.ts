import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Password Change", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should show change password section on security page", async ({
    page,
  }) => {
    await page.goto("/profile/security");
    await expect(page.getByText("Change Password")).toBeVisible();
  });

  test("should expand password change form", async ({ page }) => {
    await page.goto("/profile/security");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByPlaceholder("Current password")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("New password (min. 8 characters)")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Confirm new password")
    ).toBeVisible();
  });

  test("should cancel password change form", async ({ page }) => {
    await page.goto("/profile/security");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByPlaceholder("Current password")
    ).not.toBeVisible();
  });
});
