import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers";

// Axe scans for WCAG issues. Only "critical" and "serious" violations fail the
// test — "moderate" and "minor" findings are logged but non-blocking so we
// can make forward progress without drowning in false positives from
// third-party libraries.

const BLOCKING_IMPACTS: ReadonlyArray<string> = ["critical", "serious"];

async function runAxe(
  page: import("@playwright/test").Page,
  opts: { disabledRules?: string[] } = {},
) {
  let builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (opts.disabledRules?.length) {
    builder = builder.disableRules(opts.disabledRules);
  }
  const results = await builder.analyze();
  const blocking = results.violations.filter(
    (v) => v.impact && BLOCKING_IMPACTS.includes(v.impact),
  );

  if (blocking.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      "Axe violations:\n" +
        blocking
          .map(
            (v) =>
              `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`,
          )
          .join("\n"),
    );
  }

  return { violations: results.violations, blocking };
}

test.describe("Accessibility — public pages", () => {
  test("login page has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });

  test("signup page has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });
});

test.describe("Accessibility — authenticated pages", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });

  test("workouts page has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/workouts");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });

  test("exercises page has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/exercises");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });

  test("profile page has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });

  test("goals page has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");
    const { blocking } = await runAxe(page);
    expect(blocking).toEqual([]);
  });
});
