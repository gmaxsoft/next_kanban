import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";
import {
  e2eInboundWebhookSecret,
  hasAdminCredentials,
} from "./helpers/env";

test.describe("Admin CRUD", () => {
  test.skip(!hasAdminCredentials, "Set E2E_ADMIN_* or SEED_ADMIN_* in .env");

  test.describe.configure({ mode: "serial" });

  test("logs in with remember-me and opens admin areas", async ({ page }) => {
    await loginAsAdmin(page, { rememberMe: true });

    await page.goto("/users");
    await expect(page.locator("h2", { hasText: "Użytkownicy" })).toBeVisible();

    await page.goto("/boards");
    await expect(page.locator("h2", { hasText: "Tablice" })).toBeVisible();

    await page.goto("/tickets");
    await expect(page.locator("h2", { hasText: "Tickety" })).toBeVisible();
  });

  test("creates a user", async ({ page }) => {
    await loginAsAdmin(page);

    const stamp = Date.now();
    const name = `E2E User ${stamp}`;
    const email = `e2e.user.${stamp}@example.com`;

    await page.goto("/users");
    await page.getByLabel("Imię i nazwisko").fill(name);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło tymczasowe").fill("TestPass123!");
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(name)).toBeVisible();
  });

  test("creates a board, adds a task, and edits it", async ({ page }) => {
    await loginAsAdmin(page);

    const stamp = Date.now();
    const boardTitle = `E2E Board ${stamp}`;
    const taskTitle = `E2E Task ${stamp}`;
    const editedTitle = `E2E Task edited ${stamp}`;

    await page.goto("/boards");
    await page.getByLabel("Nazwa tablicy").fill(boardTitle);
    await page.getByRole("button", { name: "Utwórz tablicę" }).click();

    await expect(page).toHaveURL(/\/boards\/[^/]+$/, { timeout: 20_000 });
    await expect(page.locator("h2", { hasText: boardTitle })).toBeVisible();

    const taskInput = page.getByPlaceholder("Nowe zadanie...").first();
    await expect(taskInput).toBeVisible({ timeout: 20_000 });
    await taskInput.fill(taskTitle);
    await page.getByRole("button", { name: "Dodaj" }).first().click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("tab", { name: "Lista" }).click();
    await expect(page).toHaveURL(/view=list/, { timeout: 10_000 });
    await expect(page.getByRole("columnheader", { name: "Zadanie" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/boards\/[^/]+\/tasks\//, { timeout: 15_000 }),
      page.getByRole("link", { name: taskTitle, exact: true }).click(),
    ]);

    await expect(
      page.locator("h2", { hasText: "Szczegóły zadania" }),
    ).toBeVisible();

    const titleInput = page.locator("#page-task-title");
    await expect(titleInput).toHaveValue(taskTitle);
    await titleInput.fill(editedTitle);
    await page.getByRole("button", { name: "Zapisz zmiany" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();

    await expect(page.locator('[data-slot="card-title"]')).toHaveText(
      editedTitle,
      { timeout: 20_000 },
    );

    await page.getByText("Wróć do tablicy").click();
    await expect(page).toHaveURL(/\/boards\/[^/]+/, { timeout: 15_000 });
    await expect(page.getByText(editedTitle)).toBeVisible({ timeout: 15_000 });
  });

  test("creates a ticket via inbound webhook and updates status", async ({
    page,
    request,
  }) => {
    test.skip(
      !e2eInboundWebhookSecret,
      "Set INBOUND_EMAIL_WEBHOOK_SECRET to create tickets in E2E",
    );

    await loginAsAdmin(page);

    const stamp = Date.now();
    const subject = `E2E Ticket ${stamp}`;

    const response = await request.post("/api/webhooks/inbound-email", {
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": e2eInboundWebhookSecret,
      },
      data: {
        from: `klient.e2e.${stamp}@example.com`,
        to: "support@example.com",
        subject,
        text: "Treść zgłoszenia z testu E2E",
        messageId: `<e2e-${stamp}@example.com>`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      ok?: boolean;
      ticketId?: string;
      displayId?: string | null;
    };
    expect(body.ok).toBe(true);
    expect(body.ticketId).toBeTruthy();

    await page.goto("/tickets");
    await expect(page.getByText(subject)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: new RegExp(subject) }).click();
    await expect(page).toHaveURL(/\/tickets\//, { timeout: 15_000 });

    await page.locator("#ticket-status").selectOption("IN_PROGRESS");
    await page.getByRole("button", { name: "Zmień status" }).click();
    await expect(page.getByText("W trakcie").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
