import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "./helpers";

const BLOCKING_IMPACTS: ReadonlyArray<string> = ["critical", "serious"];
const ALWAYS_DISABLED_RULES: ReadonlyArray<string> = ["color-contrast"];

test.describe("Recovery Page", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows the Recovery heading and log-injury form", async ({ page }) => {
    await page.goto("/recovery");
    await expect(
      page.getByRole("heading", { name: /recovery/i, level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /log injury/i })
    ).toBeVisible();
  });

  test("logs an injury, views its detail page, and logs a recovery activity", async ({
    page,
  }) => {
    await page.goto("/recovery");

    // Log a new injury via the form on the list page.
    await page.getByLabel("Date", { exact: true }).fill("2026-08-15");
    await page.getByLabel(/injury type/i).selectOption("strain");
    await page.getByLabel(/severity/i).fill("5");

    const bodyPartInput = page.getByLabel("Body part", { exact: true });
    const bodyPart = `e2e-part-${Date.now()}`;
    await bodyPartInput.fill(bodyPart);
    await bodyPartInput.press("Enter");

    await page.getByRole("button", { name: /^log injury$/i }).click();

    // Assert it appears in the list. The list re-renders after the mutation
    // settles, so scope to .first() and re-resolve the locator on each retry
    // rather than holding a handle that may detach.
    await expect(
      page.getByText(bodyPart, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Open its detail page. The row uses a Next.js client-side <Link>, which
    // updates history without firing a "load" event — page.waitForURL's
    // default waitUntil: "load" never resolves for it, so poll the URL via
    // toHaveURL instead (matches how sidebar-nav's full-page <a> navigation
    // differs from this page's client-side routing).
    //
    // This dev environment has an unrelated, ambient issue where the API's
    // pino transport worker thread periodically crashes the whole `next dev`
    // process (independent of which route is hit — observed on /goals and
    // /dashboard too). If that happens to land mid-navigation, the SPA's RSC
    // fetch silently fails and the click has no visible effect. Retrying the
    // click recovers once the dev server's auto-restart completes; this does
    // not relax the assertion, which still requires the detail page to load.
    let navigated = false;
    for (let attempt = 0; attempt < 4 && !navigated; attempt++) {
      // Re-resolve on each attempt: the list can rerender between retries and
      // detach a previously-held handle, which caused
      // "Element is not attached to the DOM" on scroll/click.
      const row = page.getByText(bodyPart, { exact: false }).first();
      try {
        await row.click({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/recovery\/[^/]+$/, { timeout: 5_000 });
        navigated = true;
      } catch {
        await page.waitForTimeout(2_000);
      }
    }
    expect(navigated).toBe(true);
    // CardTitle renders a <div>, not a semantic heading element (see
    // apps/web/src/components/ui/card.tsx), so match on text instead of role.
    await expect(page.getByText(/^strain/i)).toBeVisible();

    // Log a recovery activity against it.
    await page.getByLabel(/modality/i).selectOption("ice");
    await page
      .getByRole("button", { name: /log recovery activity/i })
      .click();

    // Assert it appears on the timeline (scoped to a <span>, since the
    // modality <select> also has a same-named "Ice" <option>).
    await expect(page.locator("span").filter({ hasText: "Ice" })).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test("has no critical or serious a11y violations", async ({ page }) => {
    await page.goto("/recovery");
    await page.waitForLoadState("networkidle");
    const builder = new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(ALWAYS_DISABLED_RULES);
    const results = await builder.analyze();
    const blocking = results.violations.filter(
      (v) => v.impact && BLOCKING_IMPACTS.includes(v.impact)
    );
    if (blocking.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        "Axe violations:\n" +
          blocking
            .map(
              (v) =>
                `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`
            )
            .join("\n")
      );
    }
    expect(blocking).toEqual([]);
  });
});
