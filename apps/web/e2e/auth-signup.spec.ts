import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Signup page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("renders name, email, password fields and create account button", async ({
    page,
  }) => {
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
  });

  test("shows heading and subtitle", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();
    await expect(page.getByText(/start tracking your fitness/i)).toBeVisible();
  });

  test("has a link back to the login page", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/login");
  });

  test("shows validation error for a password that is too short", async ({
    page,
  }) => {
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("short");
    // Check the consent checkbox to avoid that validation error
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/password must be at least 8 characters/i)
    ).toBeVisible();
  });

  test("shows validation error when name is missing", async ({ page }) => {
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("securepassword");
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("shows consent validation when checkbox is unchecked", async ({
    page,
  }) => {
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("securepassword");
    // Leave checkbox unchecked
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/you must agree to the privacy policy/i)
    ).toBeVisible();
  });

  test("has privacy policy and terms of service links", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /privacy policy/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /terms of service/i })
    ).toBeVisible();
  });

  test("shows hint text for minimum password length", async ({ page }) => {
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("toggles to magic link view when 'Email me a sign-in link' is clicked", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /email me a sign-in link/i })
      .click();

    await expect(
      page.getByRole("heading", { name: /sign up with email/i })
    ).toBeVisible();
    await expect(page.getByText(/we'll send you a magic link/i)).toBeVisible();

    // Main form inputs should no longer be visible
    await expect(page.getByLabel("Name")).not.toBeVisible();
  });

  test("can navigate back from magic link view to signup form", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /email me a sign-in link/i })
      .click();
    await page.getByRole("button", { name: /back to sign up/i }).click();

    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
  });
});
