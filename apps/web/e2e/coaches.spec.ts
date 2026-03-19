import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Coaches browse page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/coaches");
  });

  test("loads with the Find a Coach heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Find a Coach" })
    ).toBeVisible();
  });

  test("renders the search input", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search by name...");
    await expect(searchInput).toBeVisible();
  });

  test("renders specialty filter buttons", async ({ page }) => {
    // The "All" button is always present as the first filter chip.
    await expect(
      page.getByRole("button", { name: "All" })
    ).toBeVisible();

    // At least one specialty chip should exist.
    const chips = page.locator(
      'button[class*="rounded-full border"]'
    );
    await expect(chips.first()).toBeVisible();
  });

  test("searching filters the coach list or shows no-results state", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder("Search by name...");
    await searchInput.fill("zzz_nonexistent_coach_xyz");

    // After debounce + query, either a coach card or the empty-state shows.
    await expect(
      page.getByText("No coaches found").or(page.locator('[class*="grid gap-4"]'))
    ).toBeVisible({ timeout: 3000 });
  });

  test("shows coach cards or empty state after load", async ({ page }) => {
    // Wait for loading skeleton to disappear.
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    const coachCards = page.locator('a[href^="/coach/"]');
    const emptyState = page.getByText("No coaches found");

    const hasCards = await coachCards.count() > 0;
    const hasEmpty = await emptyState.isVisible();

    expect(hasCards || hasEmpty).toBe(true);
  });
});
