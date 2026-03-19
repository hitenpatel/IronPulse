import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Stats page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("loads with Stats heading", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Stats", level: 1 })
    ).toBeVisible();
  });

  test("shows Training Status section", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Training Status" })
    ).toBeVisible();
  });

  test("shows Training Load section", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Training Load" })
    ).toBeVisible();
  });

  test("shows Muscle Volume section", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Muscle Volume" })
    ).toBeVisible();
  });

  test("shows Body Weight section", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Body Weight" })
    ).toBeVisible();
  });

  test("shows Progress Photos section", async ({ page }) => {
    await page.goto("/stats");

    await expect(
      page.getByRole("heading", { name: "Progress Photos" })
    ).toBeVisible();
  });

  test("body weight log form is present with weight input", async ({
    page,
  }) => {
    await page.goto("/stats");

    // Wait a moment for async data to settle so the form renders
    await page.waitForTimeout(1000);

    const weightInput = page.getByPlaceholder("Weight (kg)");
    await expect(weightInput).toBeVisible();

    // Input should accept numeric values
    await weightInput.fill("75.5");
    await expect(weightInput).toHaveValue("75.5");
  });

  test("body weight form has Save button", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForTimeout(1000);

    const saveButton = page.getByRole("button", { name: "Save" });
    await expect(saveButton).toBeVisible();
  });

  test("Log Weight card heading is visible", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForTimeout(1000);

    await expect(page.getByText("Log Weight")).toBeVisible();
  });

  test("Weekly Volume card heading is visible after loading", async ({
    page,
  }) => {
    await page.goto("/stats");
    await page.waitForTimeout(1000);

    // The card title "Weekly Volume" is rendered once data loads (or empty state)
    await expect(page.getByText("Weekly Volume")).toBeVisible();
  });

  test("Workout Frequency card heading is visible after loading", async ({
    page,
  }) => {
    await page.goto("/stats");
    await page.waitForTimeout(1000);

    await expect(page.getByText("Workout Frequency")).toBeVisible();
  });
});
