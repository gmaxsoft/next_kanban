import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";
import { hasAdminCredentials } from "./helpers/env";

test.describe("Authenticated smoke", () => {
  test.skip(!hasAdminCredentials, "Set E2E_ADMIN_* or SEED_ADMIN_* in .env");

  test("logs in and opens tickets page as admin", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/tickets");
    await expect(page.locator("h2", { hasText: "Tickety" })).toBeVisible();
    await expect(page.locator("#filter-status")).toBeVisible();
    await expect(page.locator("#filter-status")).toContainText("Otwarte");
    await expect(page.locator("#filter-status")).toContainText("W trakcie");
    await expect(page.locator("#filter-status")).toContainText("Rozwiązane");
  });
});
