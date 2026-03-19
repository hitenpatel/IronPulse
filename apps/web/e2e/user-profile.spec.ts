import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("User Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("should load own profile page", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: /profile/i })).toBeVisible();
  });

  test("should navigate to user profile from users list", async ({ page }) => {
    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: "Find Users" })
    ).toBeVisible();
  });
});
