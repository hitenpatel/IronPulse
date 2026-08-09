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
    // The checkbox is disabled while the profile query loads — reading or
    // clicking before it settles races against the real checked state.
    await expect(toggle).toBeEnabled();

    const initial = await toggle.isChecked();
    await toggle.click();
    // The checkbox is controlled: its state only flips once the mutation
    // succeeds and the query refetches. Wait for that, not a fixed timeout.
    await expect(toggle).toBeChecked({ checked: !initial, timeout: 10_000 });

    await page.reload();
    const reloaded = page.getByLabel(/weekly summary email toggle/i);
    await expect(reloaded).toBeEnabled();
    await expect(reloaded).toBeChecked({ checked: !initial, timeout: 10_000 });

    // Reset so the test is idempotent for the shared seed user.
    await reloaded.click();
    await expect(reloaded).toBeChecked({ checked: initial, timeout: 10_000 });
  });
});
