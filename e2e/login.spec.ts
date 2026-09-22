import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("shows login form and license branding", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Hasło")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Wejdź do panelu/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Zapamiętaj mnie")).toBeChecked();

    const licenseAside = page.locator("aside").filter({
      hasText: "Licencja oprogramowania",
    });
    await expect(licenseAside).toBeVisible();
    await expect(licenseAside.getByText(/Licencjobiorca:/)).toBeVisible();
    await expect(licenseAside.getByText(/Dostawca:/)).toBeVisible();
    await expect(
      licenseAside.locator("p").filter({ hasText: /^Licencjobiorca:/ }),
    ).toContainText("Autor:");
  });

  test("keeps user on login after invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("nieistnieje@example.com");
    await page.getByLabel("Hasło").fill("zle-haslo-123");
    await page.getByRole("button", { name: /Wejdź do panelu/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();
  });
});
