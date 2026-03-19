import { type Page } from "@playwright/test";

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByTestId("email-input").fill("test@example.com");
  await page.getByTestId("password-input").fill("password123");
  await page.getByTestId("signin-button").click();
  await page.waitForURL(/\/(dashboard|workouts|feed)/);
}
