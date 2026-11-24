import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * E2E flow 2 (testing-strategy §10): a playground made by hand, from the form
 * to the review sheet, with the cast generated in the engine Web Worker.
 * Elements are found by role and accessible text, never by CSS class.
 */

async function addCharacter(page: Page, archetype: string, name: string, card: string) {
  await page.getByLabel("Arquétipo do novo personagem").selectOption(archetype);
  await page.getByRole("button", { name: "Adicionar personagem" }).click();
  await page.getByRole("group", { name: card }).getByLabel("Nome", { exact: true }).fill(name);
}

/** Opens the review sheet, reads its status (with the fingerprint of the opened scene) and goes back. */
async function reviewedState(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Revisar ficha" }).click();
  await expect(page.getByRole("heading", { name: "Ficha da cena" })).toBeFocused();
  const status = await page.getByRole("status").textContent();
  await page.getByRole("button", { name: "Voltar e editar" }).click();
  return status ?? "";
}

function bond(page: Page): Locator {
  return page.getByRole("group", { name: "Laço 1" });
}

test("given a manual playground when confirming then the review sheet shows the chosen cast and a valid setup", async ({
  page,
}) => {
  await page.goto("/#/playground");
  await page.getByLabel("Seed do elenco").fill("20261123");
  await page.getByLabel("Seed da cena").fill("7");
  await page.getByLabel("Lugar", { exact: true }).selectOption({ label: "interior social" });
  await page.getByLabel("Clima").selectOption({ label: "chuva" });
  await page.getByLabel("Horário").fill("21:30");
  await addCharacter(page, "caretaker", "Marta", "Personagem 1");
  await addCharacter(page, "rebel", "Joca", "Personagem 2");
  await page.getByRole("button", { name: "Adicionar laço" }).click();
  await bond(page).getByLabel("Arquétipo do laço").selectOption({ label: "inimigos" });

  await page.getByRole("button", { name: "Gerar elenco" }).click();
  await expect(page.getByRole("list", { name: "Laços gerados" })).toContainText(
    "Marta → Joca: inimigo(a)",
  );
  await page.getByRole("group", { name: "Personagem 1" }).getByRole("checkbox").check();
  await page.getByRole("group", { name: "Personagem 2" }).getByRole("checkbox").check();
  await bond(page).getByLabel("Travar laço").check();
  const first = await reviewedState(page);
  await page.getByRole("button", { name: "Sortear de novo" }).click();
  await expect(page.getByRole("heading", { name: "Elenco gerado (tentativa 1)" })).toBeVisible();
  expect(await reviewedState(page)).toBe(first);

  await page.getByLabel("Posição de Marta").selectOption({ label: "(1, 1)" });
  await page.getByLabel("Personagem do jogador").selectOption({ label: "Joca" });
  await page.getByRole("button", { name: "Revisar ficha" }).click();

  await expect(page.getByRole("heading", { name: "Ficha da cena" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Configuração válida.");
  await expect(page.getByRole("row", { name: /Marta/ })).toContainText("(1, 1)");
  await expect(page.getByRole("row", { name: /Joca/ })).toContainText("jogador");
  await expect(page.getByText("21:30 (noite)")).toBeVisible();
});

test("given the manual form with no character when reviewing then the problem is announced", async ({
  page,
}) => {
  await page.goto("/#/playground");

  await page.getByRole("button", { name: "Revisar ficha" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Adicione pelo menos um personagem ao elenco.",
  );
});

test("given the navigation when moving with the keyboard then the scene screen opens", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Cena" })).toBeFocused();

  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { level: 2, name: "Cena" })).toBeVisible();
});
