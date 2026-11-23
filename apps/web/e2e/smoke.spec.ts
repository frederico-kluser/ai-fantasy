import { expect, test } from "@playwright/test";

/**
 * Smoke test of the built site served by the local server (testing-strategy §10).
 * Elements are found by role and accessible text, never by CSS class.
 */

test("given the web app when opening the start page then the title and the sentence are shown", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("AI Fantasy");
  await expect(
    page.getByRole("heading", { level: 1, name: "AI Fantasy", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Simulador de conversas com NPCs que simulam pessoas, movido pelo Hermeneutic Core.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("given the local server when calling /api/health then it answers ok", async ({ request }) => {
  const response = await request.get("/api/health");
  const body: unknown = await response.json();

  expect({ status: response.status(), body }).toEqual({ status: 200, body: { status: "ok" } });
});
