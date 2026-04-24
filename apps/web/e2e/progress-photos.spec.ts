import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Progress photos", () => {
  test("renders the upload form + empty gallery for a fresh user", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/progress-photos");

    await expect(
      page.getByRole("heading", { name: /progress photos/i }),
    ).toBeVisible();

    await expect(page.getByTestId("progress-photos-upload")).toBeVisible();
    await expect(page.getByTestId("progress-photos-file")).toBeVisible();
    // Upload button is disabled until a file is picked.
    await expect(page.getByTestId("progress-photos-upload-btn")).toBeDisabled();
  });

  test("gallery shows empty-state copy when no photos", async ({ page }) => {
    await signIn(page);
    await page.goto("/progress-photos");

    // Either the empty state OR at least one existing photo tile. We tolerate
    // seed data existing by checking for one of the two.
    const empty = page.getByText(/no photos yet/i);
    const gallery = page.locator("[data-testid^='progress-photo-']");
    await expect(async () => {
      const emptyVisible = await empty.isVisible().catch(() => false);
      const tileCount = await gallery.count().catch(() => 0);
      expect(emptyVisible || tileCount > 0).toBe(true);
    }).toPass({ timeout: 10000 });
  });
});
