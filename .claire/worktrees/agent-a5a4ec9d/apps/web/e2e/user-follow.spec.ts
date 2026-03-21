import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Find Users / follow page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/users");
  });

  test("loads with the Find Users heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Find Users" })
    ).toBeVisible();
  });

  test("renders the search input", async ({ page }) => {
    await expect(
      page.getByPlaceholder("Search by name...")
    ).toBeVisible();
  });

  test("shows prompt text before any search is entered", async ({ page }) => {
    await expect(
      page.getByText("Start typing to search for users.")
    ).toBeVisible();
  });

  test("typing a query shows results or empty state", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search by name...");
    await searchInput.fill("a");

    // Wait for debounce (300 ms) + network round-trip.
    await page.waitForTimeout(500);

    const results = page.locator('[class*="space-y-3"] [data-testid], [class*="space-y-3"] .rounded-xl');
    const noUsers = page.getByText("No users found.");
    const loading = page.locator('[class*="animate-pulse"]');

    // Wait until loading skeleton is gone.
    await expect(loading).toHaveCount(0, { timeout: 10_000 });

    const hasResults = await results.count() > 0;
    const hasEmpty = await noUsers.isVisible();

    expect(hasResults || hasEmpty).toBe(true);
  });

  test("searching for a specific term shows Follow or Unfollow buttons when results exist", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder("Search by name...");
    await searchInput.fill("test");

    // Wait for debounce + network.
    await page.waitForTimeout(500);
    await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    const userCards = page.locator('[class*="space-y-3"]').locator(".rounded-xl");

    if (await userCards.count() > 0) {
      // Each result card must have a Follow or Unfollow button.
      const firstCard = userCards.first();
      const followBtn = firstCard.getByRole("button", { name: /follow/i });
      await expect(followBtn).toBeVisible();
    }
  });

  test("clearing the search returns to the initial prompt", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder("Search by name...");
    await searchInput.fill("something");
    await page.waitForTimeout(400);

    await searchInput.clear();
    await page.waitForTimeout(400);

    await expect(
      page.getByText("Start typing to search for users.")
    ).toBeVisible();
  });
});
