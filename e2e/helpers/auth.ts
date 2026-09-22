import { expect, type Page } from "@playwright/test";

import { e2eAdminEmail, e2eAdminPassword } from "./env";

export async function loginAsAdmin(
  page: Page,
  options?: { rememberMe?: boolean },
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(e2eAdminEmail);
  await page.getByLabel("Hasło").fill(e2eAdminPassword);

  const remember = page.getByLabel("Zapamiętaj mnie");
  if (options?.rememberMe === false) {
    await remember.uncheck();
  } else {
    await remember.check();
  }

  await page.getByRole("button", { name: /Wejdź do panelu/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
