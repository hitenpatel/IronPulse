import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Calendar page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("loads with Calendar heading", async ({ page }) => {
    await page.goto("/calendar");

    await expect(
      page.getByRole("heading", { name: "Calendar", level: 1 })
    ).toBeVisible();
  });

  test("displays the current month and year label", async ({ page }) => {
    await page.goto("/calendar");

    const now = new Date();
    const expectedMonthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    await expect(page.getByText(expectedMonthYear)).toBeVisible();
  });

  test("renders weekday header row (Mon through Sun)", async ({ page }) => {
    await page.goto("/calendar");

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const day of weekdays) {
      await expect(page.getByText(day)).toBeVisible();
    }
  });

  test("month grid contains day number buttons", async ({ page }) => {
    await page.goto("/calendar");

    // Day 1 is always in every month
    const dayOne = page.getByRole("button", { name: "1" }).first();
    await expect(dayOne).toBeVisible();
  });

  test("previous month navigation works", async ({ page }) => {
    await page.goto("/calendar");

    const now = new Date();
    const currentMonthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Compute expected previous month label
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthYear = prev.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Scope to the nav row containing the month label to avoid matching sidebar SVG buttons
    const prevButton = page.getByText(currentMonthYear, { exact: true }).locator('..').getByRole('button').first();
    await prevButton.click();

    await expect(page.getByText(prevMonthYear)).toBeVisible();
    await expect(page.getByText(currentMonthYear)).not.toBeVisible();
  });

  test("next month navigation works", async ({ page }) => {
    await page.goto("/calendar");

    const now = new Date();
    const currentMonthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Compute expected next month label
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthYear = next.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Scope to the nav row containing the month label to avoid matching sidebar SVG buttons
    const nextButton = page.getByText(currentMonthYear, { exact: true }).locator('..').getByRole('button').last();
    await nextButton.click();

    await expect(page.getByText(nextMonthYear)).toBeVisible();
    await expect(page.getByText(currentMonthYear)).not.toBeVisible();
  });

  test("can navigate back and forth between months", async ({ page }) => {
    await page.goto("/calendar");

    const now = new Date();
    const currentMonthYear = now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const navButtons = page.locator('button:has(svg)');
    const prevButton = navButtons.first();
    const nextButton = navButtons.nth(1);

    // Go to previous month
    await prevButton.click();

    // Come back to current month
    await nextButton.click();

    await expect(page.getByText(currentMonthYear)).toBeVisible();
  });

  test("legend shows Workout and Cardio indicators", async ({ page }) => {
    await page.goto("/calendar");

    await expect(page.getByText("Workout")).toBeVisible();
    await expect(page.getByText("Cardio")).toBeVisible();
  });

  test("clicking a day cell selects it and shows day detail area", async ({
    page,
  }) => {
    await page.goto("/calendar");

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Click day 1 (always present)
    const dayOne = page.getByRole("button", { name: "1" }).first();
    await dayOne.click();

    // After selecting a day, a detail section appears with either activity or "No activity"
    const noActivity = page.getByText("No activity");
    const hasActivity = page.locator('a[href^="/workouts/"], a[href^="/cardio/"]').first();

    const showsNoActivity = await noActivity.isVisible().catch(() => false);
    const showsActivity = await hasActivity.isVisible().catch(() => false);

    expect(showsNoActivity || showsActivity).toBe(true);
  });

  test("clicking the same day twice deselects it", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    const dayOne = page.getByRole("button", { name: "1" }).first();

    // Select
    await dayOne.click();
    // Deselect
    await dayOne.click();

    // Detail section should disappear
    await expect(page.getByText("No activity")).not.toBeVisible();
  });
});
