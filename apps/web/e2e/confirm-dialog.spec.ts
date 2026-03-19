import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Confirm Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should show dialog instead of native confirm for passkey deletion", async ({
    page,
  }) => {
    await page.goto("/profile/security");
    await page.waitForTimeout(1000);

    // If passkeys exist, the delete button should trigger a dialog
    const deleteButton = page.getByLabel("Delete").first();
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();
      // Should show dialog, not native confirm
      await expect(page.getByText("Delete passkey")).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    }
  });

  test("should show dialog for template deletion", async ({ page }) => {
    await page.goto("/templates");
    await page.waitForTimeout(1000);

    const deleteButton = page.getByLabel("Delete template").first();
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();
      await expect(page.getByText("Delete template")).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    }
  });
});
