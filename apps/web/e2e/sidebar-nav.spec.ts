import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should have all nav links", async ({ page }) => {
    await page.goto("/dashboard");
    // Verify key nav links added in Sprint 4
    await expect(page.getByLabel("Workouts")).toBeVisible();
    await expect(page.getByLabel("Templates")).toBeVisible();
    await expect(page.getByLabel("Feed")).toBeVisible();
    await expect(page.getByLabel("Messages")).toBeVisible();
    await expect(page.getByLabel("My Program")).toBeVisible();
    await expect(page.getByLabel("Stats")).toBeVisible();
    await expect(page.getByLabel("Exercises")).toBeVisible();
  });

  test("should navigate to workouts", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByLabel("Workouts").click();
    await page.waitForURL("/workouts");
  });

  test("should navigate to feed", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByLabel("Feed").click();
    await page.waitForURL("/feed");
    await expect(
      page.getByRole("heading", { name: "Activity Feed" })
    ).toBeVisible();
  });
});
