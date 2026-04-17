import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Goals Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows empty state or goal list", async ({ page }) => {
    await page.goto("/goals");
    await expect(
      page.getByRole("heading", { name: /goals/i, level: 1 })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /new goal/i })).toBeVisible();
  });

  test("opens create form and shows all goal types", async ({ page }) => {
    await page.goto("/goals");
    await page.getByRole("button", { name: /new goal/i }).click();

    await expect(page.getByText("Body Weight")).toBeVisible();
    await expect(page.getByText("Exercise PR")).toBeVisible();
    await expect(page.getByText("Weekly Workouts")).toBeVisible();
    await expect(page.getByText("Cardio Distance")).toBeVisible();
  });

  test("creates and deletes a weekly workouts goal", async ({ page }) => {
    await page.goto("/goals");
    await page.getByRole("button", { name: /new goal/i }).click();

    await page.getByRole("button", { name: /weekly workouts/i }).click();
    const title = `Test goal ${Date.now()}`;
    await page.getByPlaceholder(/goal title/i).fill(title);

    // Target field is the first number input
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill("5");

    await page.getByRole("button", { name: /^create goal$/i }).click();

    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    // Delete the goal
    const goalCard = page.locator(`text=${title}`).first().locator('..').locator('..');
    await goalCard.getByRole("button").last().click();
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 10000 });
  });
});
