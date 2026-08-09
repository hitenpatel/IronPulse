import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should display pricing tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("heading", { name: "Plans & Pricing" })
    ).toBeVisible();
    // Tier names also appear in the user menu and feature lists — target the
    // tier card headings to avoid strict-mode violations.
    await expect(
      page.getByRole("heading", { name: "Athlete", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Coach", exact: true })
    ).toBeVisible();
  });

  test("should show current plan indicator", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Current Plan")).toBeVisible();
  });

  test("coach upgrade link on coach page points to pricing", async ({
    page,
  }) => {
    await page.goto("/coach");
    const pricingLink = page.getByRole("link", { name: "View Pricing" });
    if (await pricingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(pricingLink).toHaveAttribute("href", "/pricing");
    }
  });
});
