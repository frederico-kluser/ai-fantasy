import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { inProcessEngine, SEEDS } from "../../test/support.ts";
import { PlaygroundPage } from "./PlaygroundPage.tsx";

function renderPage() {
  return render(<PlaygroundPage engine={inProcessEngine()} seeds={{ ...SEEDS }} />);
}

function choose(label: string, value: string, scope: HTMLElement = document.body): void {
  fireEvent.change(within(scope).getByLabelText(label), { target: { value } });
}

function click(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function group(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

function valueOf(label: string, scope: HTMLElement = document.body): string {
  // Inputs and selects both expose `value`.
  return within(scope).getByLabelText<HTMLInputElement>(label).value;
}

/** Adds characters of the archetypes given, named in order. */
function addCast(...people: readonly (readonly [string, string])[]): void {
  people.forEach(([name, archetype], index) => {
    choose("Arquétipo do novo personagem", archetype);
    click("Adicionar personagem");
    choose("Nome", name, group(`Personagem ${String(index + 1)}`));
  });
}

async function generated(): Promise<HTMLElement> {
  return screen.findByRole("heading", { name: /^Elenco gerado/ });
}

describe("manual playground: validation", () => {
  it("given the manual form with no character when submitting then validation explains what is missing", async () => {
    renderPage();

    click("Revisar ficha");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Revise a ficha:Adicione pelo menos um personagem ao elenco.",
    );
  });

  it("given a nameless character when generating then validation asks for its name", async () => {
    renderPage();
    click("Adicionar personagem");

    click("Gerar elenco");

    expect((await screen.findByRole("alert")).textContent).toContain("Dê um nome ao personagem 1.");
  });

  it("given a duplicate bond when reviewing then the engine problem is listed", async () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);
    click("Adicionar laço");
    click("Adicionar laço");

    click("Revisar ficha");

    expect((await screen.findByRole("alert")).textContent).toContain("Esse par já tem um laço.");
  });

  it("given a fixed problem when generating again then the alert goes away", async () => {
    renderPage();
    click("Revisar ficha");
    await screen.findByRole("alert");
    addCast(["Ana", "caretaker"]);

    click("Gerar elenco");
    await generated();

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("manual playground: generation", () => {
  it("given a cast and a bond when generating then the generated characters and bonds are shown", async () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);
    click("Adicionar laço");
    choose("Arquétipo do laço", "siblings");

    click("Gerar elenco");
    await generated();

    expect([
      within(screen.getByRole("list", { name: "Personagens gerados" }))
        .getAllByRole("listitem")
        .map((item) => item.querySelector("strong")?.textContent),
      within(screen.getByRole("list", { name: "Laços gerados" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ]).toStrictEqual([
      ["Ana", "Bia"],
      ["Ana → Bia: irmão(ã)", "Bia → Ana: irmão(ã)"],
    ]);
  });

  it("given a generated character when showing then its dominant drives are named", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);

    click("Gerar elenco");
    await generated();

    expect(
      within(screen.getByRole("list", { name: "Personagens gerados" })).getByRole("listitem")
        .textContent,
    ).toMatch(/^Ana: quer companhia, intimidade, cuidado/);
  });

  it("given a name with markup when generating then it is shown as text", async () => {
    renderPage();
    addCast(["<b>Ana</b>", "caretaker"]);

    click("Gerar elenco");
    await generated();

    expect(
      within(screen.getByRole("list", { name: "Personagens gerados" })).getByText("<b>Ana</b>")
        .tagName,
    ).toBe("STRONG");
  });

  it("given friends with no tension when generating then the tension hook is shown", async () => {
    renderPage();
    addCast(["Ana", "merchant"], ["Bia", "scholar"]);
    click("Adicionar laço");
    choose("Arquétipo do laço", "old_friends");

    click("Gerar elenco");
    await generated();

    expect(screen.getByText(/^Gancho de tensão: (Ana → Bia|Bia → Ana), .+\.$/)).toBeDefined();
  });

  it("given a generated cast when generating again then the attempt moves on", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);
    click("Gerar elenco");
    await generated();

    click("Sortear de novo");

    expect(
      (await screen.findByRole("heading", { name: "Elenco gerado (tentativa 1)" })).tagName,
    ).toBe("H3");
  });

  it("given a cast seed when regenerating bonds with one locked then the locked bond stays", async () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);
    click("Adicionar laço");
    click("Gerar elenco");
    await generated();
    const bond = group("Laço 1");
    const before = valueOf("confiança, Ana → Bia", bond);
    fireEvent.click(within(bond).getByLabelText("Travar laço"));

    click("Sortear de novo");
    await screen.findByRole("heading", { name: "Elenco gerado (tentativa 1)" });

    expect([
      valueOf("confiança, Ana → Bia", group("Laço 1")),
      within(group("Laço 1")).getByLabelText<HTMLInputElement>("Travar laço").checked,
    ]).toStrictEqual([before, true]);
  });

  it("given a generated bond when editing an axis then the bond locks with the value", async () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);
    click("Adicionar laço");
    click("Gerar elenco");
    await generated();

    choose("afeto, Bia → Ana", "1234", group("Laço 1"));

    expect([
      valueOf("afeto, Bia → Ana", group("Laço 1")),
      within(group("Laço 1")).getByLabelText<HTMLInputElement>("Travar laço").checked,
    ]).toStrictEqual(["1234", true]);
  });

  it("given nothing generated when showing a bond then its lock is disabled and no axis shows", () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);

    click("Adicionar laço");

    expect([
      within(group("Laço 1")).getByLabelText<HTMLInputElement>("Travar laço").disabled,
      within(group("Laço 1")).queryByText(/^Eixos sorteados/),
    ]).toStrictEqual([true, null]);
  });

  it("given a generated character when locking and generating again then its lock stays checked", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);
    click("Gerar elenco");
    await generated();
    fireEvent.click(within(group("Personagem 1")).getByLabelText("Travar valores sorteados"));

    click("Sortear de novo");
    await screen.findByRole("heading", { name: "Elenco gerado (tentativa 1)" });

    expect(
      within(group("Personagem 1")).getByLabelText<HTMLInputElement>("Travar valores sorteados")
        .checked,
    ).toBe(true);
  });

  it("given a generated cast when the cast changes then the generated cast goes away", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);
    click("Gerar elenco");
    await generated();

    choose("Nome", "Ana Maria", group("Personagem 1"));

    expect([
      screen.queryByRole("heading", { name: /^Elenco gerado/ }),
      screen.getByRole("button", { name: "Gerar elenco" }).tagName,
    ]).toStrictEqual([null, "BUTTON"]);
  });
});

describe("manual playground: family pairs", () => {
  it("given a family when generating then the pair the family added can be locked and stays locked", async () => {
    renderPage();
    addCast(["Rosa", "elder"], ["Marta", "caretaker"], ["Joca", "child"]);
    click("Adicionar laço");
    click("Adicionar laço");
    choose("Arquétipo do laço", "parent_child", group("Laço 1"));
    choose("Lado A", "1", group("Laço 2"));
    choose("Lado B", "2", group("Laço 2"));
    choose("Arquétipo do laço", "parent_child", group("Laço 2"));
    click("Gerar elenco");
    await generated();
    fireEvent.click(
      within(group("Pares acrescentados pela família")).getByLabelText("Travar Rosa – Joca"),
    );

    click("Sortear de novo");
    await screen.findByRole("heading", { name: "Elenco gerado (tentativa 1)" });

    expect(
      within(group("Pares acrescentados pela família")).getByLabelText<HTMLInputElement>(
        "Travar Rosa – Joca",
      ).checked,
    ).toBe(true);
  });

  it("given no family when generating then no added pair is offered", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);

    click("Gerar elenco");
    await generated();

    expect(screen.queryByRole("group", { name: "Pares acrescentados pela família" })).toBeNull();
  });
});

describe("manual playground: review sheet", () => {
  it("given a manual playground when confirming then the review sheet shows the chosen cast and a valid setup", async () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);
    choose("Posição de Ana", "1,1");
    choose("Personagem do jogador", "1");

    click("Revisar ficha");

    expect([
      (await screen.findByRole("heading", { name: "Ficha da cena" })).tagName,
      screen.getByRole("status").textContent,
      screen.getAllByRole("row").map((row) => row.textContent),
    ]).toStrictEqual([
      "H2",
      expect.stringMatching(
        /^Configuração válida\. Impressão do estado: [0-9a-f]{16}\.$/,
      ) as unknown,
      [
        "PersonagemPosiçãoQuem joga",
        "Ana(1, 1)motor",
        expect.stringMatching(/^Bia\(\d+, \d+\)jogador$/) as unknown,
      ],
    ]);
  });

  it("given the scene choices when confirming then the sheet summarizes them", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);
    choose("Lugar", "wilderness");
    choose("Tag natural do lugar", "forest");
    choose("Clima", "fog");
    choose("Horário", "06:30");

    click("Revisar ficha");
    await screen.findByRole("heading", { name: "Ficha da cena" });

    expect(
      Array.from(document.querySelectorAll("dl > div"), (entry) => entry.textContent),
    ).toStrictEqual([
      "Lugarermo natural",
      "Gabaritoermo natural",
      "Tag naturalfloresta",
      "Climaneblina",
      "Horário06:30 (manhã)",
      `Seedselenco ${String(SEEDS.castSeed)}, cena ${String(SEEDS.sceneSeed)}`,
    ]);
  });

  it("given no natural tag when confirming then the sheet says none and nobody plays", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);

    click("Revisar ficha");
    await screen.findByRole("heading", { name: "Ficha da cena" });

    expect([
      screen.getByText("nenhuma").tagName,
      screen.getByRole("cell", { name: "motor" }).tagName,
    ]).toStrictEqual(["DD", "TD"]);
  });

  it("given the review sheet when confirming then the setup is shown as JSON for the scene", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);

    click("Revisar ficha");
    await screen.findByRole("heading", { name: "Ficha da cena" });

    expect(JSON.parse(screen.getByText(/"version": 1/).textContent)).toMatchObject({
      version: 1,
      seeds: SEEDS,
      place: "social_interior",
    });
  });

  it("given the review sheet when going back then the form keeps what was filled", async () => {
    renderPage();
    addCast(["Ana", "caretaker"]);
    click("Revisar ficha");
    await screen.findByRole("heading", { name: "Ficha da cena" });

    click("Voltar e editar");

    expect(valueOf("Nome", group("Personagem 1"))).toBe("Ana");
  });

  it("given a position on a taken cell when reviewing then the engine problem is listed", async () => {
    renderPage();
    addCast(["Ana", "caretaker"], ["Bia", "rebel"]);
    choose("Posição de Ana", "1,1");
    choose("Posição de Bia", "1,1");

    click("Revisar ficha");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "A posição do personagem 2 já está ocupada.",
    );
  });
});
