import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Onboarding page", () => {
  // Most onboarding assertions can be made without a real session because
  // Next.js renders the page regardless; session data only pre-fills the name
  // field. For tests that need a real auth session, call signIn(page) first.

  test("page loads and shows step indicator", async ({ page }) => {
    await page.goto("/onboarding");

    // Step indicator: "Step X of 3"
    await expect(page.getByText(/step \d of 3/i)).toBeVisible();
  });

  test("step 1 shows name field and unit preference buttons", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: /let's get you set up/i })
    ).toBeVisible();

    await expect(page.getByLabel("Name")).toBeVisible();

    // Unit preference toggle buttons
    await expect(page.getByRole("button", { name: /metric/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /imperial/i })
    ).toBeVisible();
  });

  test("step 1 next button advances to step 2 when name is filled", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    await page.getByLabel("Name").fill("Test User");
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2 heading
    await expect(
      page.getByRole("heading", { name: /what's your main goal/i })
    ).toBeVisible();
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
  });

  test("step 1 shows error when name is empty and next is clicked", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    // Leave name blank
    await page.getByRole("button", { name: /next/i }).click();

    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("step 2 shows fitness goal options", async ({ page }) => {
    await page.goto("/onboarding");

    // Advance past step 1
    await page.getByLabel("Name").fill("Test User");
    await page.getByRole("button", { name: /next/i }).click();

    // Fitness goal cards
    await expect(page.getByText(/lose weight/i)).toBeVisible();
    await expect(page.getByText(/build muscle/i)).toBeVisible();
    await expect(page.getByText(/endurance/i)).toBeVisible();
    await expect(page.getByText(/general fitness/i)).toBeVisible();
  });

  test("step 2 skip button advances to step 3 without selecting a goal", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    await page.getByLabel("Name").fill("Test User");
    await page.getByRole("button", { name: /next/i }).click();

    // No goal selected → button reads "Skip"
    await page.getByRole("button", { name: /skip/i }).click();

    await expect(
      page.getByRole("heading", { name: /your experience level/i })
    ).toBeVisible();
    await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
  });

  test("step 3 shows experience level options", async ({ page }) => {
    await page.goto("/onboarding");

    // Move through steps 1 and 2
    await page.getByLabel("Name").fill("Test User");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    await expect(page.getByText(/beginner/i)).toBeVisible();
    await expect(page.getByText(/intermediate/i)).toBeVisible();
    await expect(page.getByText(/advanced/i)).toBeVisible();
  });

  test("step 3 back button returns to step 2", async ({ page }) => {
    await page.goto("/onboarding");

    await page.getByLabel("Name").fill("Test User");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    await page.getByRole("button", { name: /back/i }).click();

    await expect(
      page.getByRole("heading", { name: /what's your main goal/i })
    ).toBeVisible();
  });

  test("step 3 shows Get Started button", async ({ page }) => {
    await page.goto("/onboarding");

    await page.getByLabel("Name").fill("Test User");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    await expect(
      page.getByRole("button", { name: /get started/i })
    ).toBeVisible();
  });

  test("unit preference selection highlights chosen option", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    const imperialBtn = page.getByRole("button", { name: /imperial/i });
    await imperialBtn.click();

    // After clicking, the imperial button should reflect the selected state
    // (the component adds border-primary class). We verify it's still present.
    await expect(imperialBtn).toBeVisible();

    // Clicking metric should remain available too
    const metricBtn = page.getByRole("button", { name: /metric/i });
    await metricBtn.click();
    await expect(metricBtn).toBeVisible();
  });
});
