import { type Page, expect } from "@playwright/test";

export async function signIn(page: Page) {
  await page.goto("/login");

  // Wait for the form inputs to be interactive (React hydration)
  const emailInput = page.getByTestId("email-input");
  await expect(emailInput).toBeVisible({ timeout: 10_000 });

  await emailInput.fill("athlete@test.com");
  await page.getByTestId("password-input").fill("password123");
  await page.getByTestId("login-button").click();
  await page.waitForURL(/\/(dashboard|workouts|feed|onboarding)/, {
    timeout: 15_000,
  });
}
