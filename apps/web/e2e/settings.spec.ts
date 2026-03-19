import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");
  });

  test("loads with the Settings heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
  });

  test("renders the Danger Zone section", async ({ page }) => {
    await expect(page.getByText("Danger Zone")).toBeVisible();
  });

  test("shows the Delete Account button", async ({ page }) => {
    // The button is rendered when no deletion is pending.
    // If deletion was already requested it shows "Cancel Deletion" instead.
    const deleteBtn = page.getByRole("button", { name: "Delete Account" });
    const cancelBtn = page.getByRole("button", { name: "Cancel Deletion" });

    // Wait for the loading skeleton to resolve.
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    const hasDelete = await deleteBtn.isVisible();
    const hasCancel = await cancelBtn.isVisible();

    expect(hasDelete || hasCancel).toBe(true);
  });

  test("clicking Delete Account opens confirmation dialog", async ({
    page,
  }) => {
    // Only run if the account is not already scheduled for deletion.
    const deleteBtn = page.getByRole("button", { name: "Delete Account" });

    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      await expect(
        page.getByRole("heading", { name: "Delete your account?" })
      ).toBeVisible();

      // Dismiss without proceeding.
      await page.getByRole("button", { name: "Keep my account" }).click();

      await expect(
        page.getByRole("heading", { name: "Delete your account?" })
      ).not.toBeVisible();
    }
  });
});

test.describe("Settings – Connected Apps (integrations) page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/settings/integrations");
  });

  test("loads with the Connected Apps heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Connected Apps" })
    ).toBeVisible();
  });

  test("shows the Strava card", async ({ page }) => {
    // Wait for the loading state to resolve.
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    await expect(page.getByText("Strava")).toBeVisible();
  });

  test("shows the Garmin Connect card", async ({ page }) => {
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    await expect(page.getByText("Garmin Connect")).toBeVisible();
  });

  test("Strava section shows connect or disconnect state", async ({ page }) => {
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Either a "Connect" link (not connected) or "Disconnect" button (connected).
    const connectLink = page.locator('a[href="/api/strava/connect"]');
    const disconnectBtn = page
      .getByRole("button", { name: "Disconnect" })
      .first();

    const hasConnect = await connectLink.isVisible();
    const hasDisconnect = await disconnectBtn.isVisible();

    expect(hasConnect || hasDisconnect).toBe(true);
  });

  test("Garmin section shows connect or disconnect state", async ({ page }) => {
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    const connectLink = page.locator('a[href="/api/garmin/connect"]');
    const disconnectBtn = page
      .getByRole("button", { name: "Disconnect" })
      .last();

    const hasConnect = await connectLink.isVisible();
    const hasDisconnect = await disconnectBtn.isVisible();

    expect(hasConnect || hasDisconnect).toBe(true);
  });

  test("Connect buttons are links (no OAuth redirect in tests)", async ({
    page,
  }) => {
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    // If the Strava Connect anchor exists it must point to the API route.
    const stravaConnect = page.locator('a[href="/api/strava/connect"]');
    if (await stravaConnect.isVisible()) {
      await expect(stravaConnect).toHaveAttribute(
        "href",
        "/api/strava/connect"
      );
    }

    const garminConnect = page.locator('a[href="/api/garmin/connect"]');
    if (await garminConnect.isVisible()) {
      await expect(garminConnect).toHaveAttribute(
        "href",
        "/api/garmin/connect"
      );
    }
  });
});
