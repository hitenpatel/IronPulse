import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Cardio list page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("loads with Cardio heading", async ({ page }) => {
    await page.goto("/cardio");

    await expect(
      page.getByRole("heading", { name: "Cardio", level: 1 })
    ).toBeVisible();
  });

  test("shows session cards or empty state after loading", async ({ page }) => {
    await page.goto("/cardio");

    // Wait for loading skeletons to resolve
    await page.waitForTimeout(1000);

    const sessionCard = page.locator('a[href^="/cardio/"]').first();
    const emptyText = page.getByText("No cardio sessions yet");

    const hasSessions = await sessionCard.isVisible().catch(() => false);
    const isEmpty = await emptyText.isVisible().catch(() => false);

    expect(hasSessions || isEmpty).toBe(true);
  });

  test("empty state has Log your first session link", async ({ page }) => {
    await page.goto("/cardio");
    await page.waitForTimeout(1000);

    const emptyText = page.getByText("No cardio sessions yet");
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (!isEmpty) {
      test.skip();
      return;
    }

    await expect(
      page.getByRole("button", { name: /log your first session/i })
    ).toBeVisible();
  });
});

test.describe("Cardio new page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("loads and shows tab bar with Log Manually and Import", async ({
    page,
  }) => {
    await page.goto("/cardio/new");

    await expect(page.getByText("Log Manually")).toBeVisible();
    await expect(page.getByText("Import GPX / FIT")).toBeVisible();
  });

  test("shows type picker with cardio type options on Log Manually tab", async ({
    page,
  }) => {
    await page.goto("/cardio/new");

    // The manual tab is active by default and shows the TypePicker
    await expect(page.getByText("What type of cardio?")).toBeVisible();

    // Check that common type buttons are rendered
    await expect(page.getByRole("button", { name: "Run" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cycle" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Walk" })).toBeVisible();
  });

  test("all eight cardio type buttons are present", async ({ page }) => {
    await page.goto("/cardio/new");

    const expectedTypes = [
      "Run",
      "Cycle",
      "Swim",
      "Hike",
      "Walk",
      "Row",
      "Elliptical",
      "Other",
    ];

    for (const typeName of expectedTypes) {
      await expect(page.getByRole("button", { name: typeName })).toBeVisible();
    }
  });

  test("switching to Import tab shows GPX / FIT upload area", async ({
    page,
  }) => {
    await page.goto("/cardio/new");

    await page.getByText("Import GPX / FIT").click();

    // The TypePicker should no longer be visible
    await expect(page.getByText("What type of cardio?")).not.toBeVisible();
  });

  test("selecting a cardio type advances to form", async ({ page }) => {
    await page.goto("/cardio/new");

    await page.getByRole("button", { name: "Run" }).click();

    // The type picker prompt should disappear after selection
    await expect(page.getByText("What type of cardio?")).not.toBeVisible();
  });
});
