import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { inProcessEngine, SEEDS } from "../test/support.ts";
import { App } from "./App.tsx";

function goTo(hash: string): void {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  goTo("");
  window.localStorage.clear();
  delete document.documentElement.dataset["theme"];
});

describe("app shell", () => {
  it("given the site when rendering then AI Fantasy is the main heading", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("AI Fantasy");
  });

  it("given the site when rendering then it says what the product is and names the engine", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    expect(
      screen.getByText(
        "Simulador de conversas com NPCs que simulam pessoas, movido pelo Hermeneutic Core.",
      ),
    ).toBeDefined();
  });

  it("given the site when rendering then the navigation links every screen", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    const links = within(screen.getByRole("navigation", { name: "Telas" })).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toStrictEqual([
      ["Playground", "#/playground"],
      ["Cena", "#/scene"],
      ["Sessões", "#/sessions"],
      ["Avaliação", "#/evaluation"],
    ]);
  });

  it("given no hash when rendering then the playground is the page and its link is current", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    expect([
      screen.getByRole("heading", { level: 2 }).textContent,
      screen.getByRole("link", { current: "page" }).textContent,
    ]).toStrictEqual(["Playground manual", "Playground"]);
  });

  it.each([
    ["#/scene", "Cena"],
    ["#/sessions", "Sessões"],
    ["#/evaluation", "Avaliação"],
  ])(
    "given the hash changes to %s when rendering then the %s page shows and its link is current",
    (hash, title) => {
      render(<App engine={inProcessEngine()} seeds={SEEDS} />);

      goTo(hash);

      expect([
        screen.getByRole("heading", { level: 2 }).textContent,
        screen.getByRole("link", { current: "page" }).textContent,
      ]).toStrictEqual([title, title]);
    },
  );

  it.each([
    ["#/scene", "Em construção: aqui a cena roda a partir da ficha confirmada no playground."],
    ["#/sessions", "Em construção: aqui ficam as campanhas, as fatias, o replay e a exportação."],
    ["#/evaluation", "Em construção: aqui você dá notas às falas e às cenas e vê as métricas."],
  ])("given the skeleton %s when showing then it says what comes there", (hash, text) => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    goTo(hash);

    expect(screen.getByText(text)).toBeDefined();
  });

  it("given an unknown hash when rendering then the page says so and no link is current", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    goTo("#/nowhere");

    expect([
      screen.getByRole("heading", { level: 2 }).textContent,
      screen.getByText("Esse endereço não existe; escolha uma tela no menu.").tagName,
      screen.queryByRole("link", { current: "page" }),
    ]).toStrictEqual(["Página não encontrada", "P", null]);
  });

  it("given the shell when unmounting then it stops listening to the hash", () => {
    const removed = vi.spyOn(window, "removeEventListener");
    onTestFinished(() => {
      removed.mockRestore();
    });

    render(<App engine={inProcessEngine()} seeds={SEEDS} />).unmount();

    expect(removed.mock.calls.map(([type]) => type)).toContain("hashchange");
  });
});

describe("theme picker", () => {
  it("given nothing stored when rendering then the theme follows the system", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    expect([
      screen.getByLabelText<HTMLSelectElement>("Tema").value,
      document.documentElement.hasAttribute("data-theme"),
    ]).toStrictEqual(["system", false]);
  });

  it("given the theme picker when choosing dark then the page turns dark and the choice is kept", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "dark" } });

    expect([
      document.documentElement.dataset["theme"],
      window.localStorage.getItem("ai-fantasy.theme"),
    ]).toStrictEqual(["dark", "dark"]);
  });

  it("given a stored light theme when rendering then the page starts light", () => {
    window.localStorage.setItem("ai-fantasy.theme", "light");

    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    expect(document.documentElement.dataset["theme"]).toBe("light");
  });

  it("given the theme options when listing then they name system, light and dark", () => {
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    expect(
      within(screen.getByLabelText("Tema"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toStrictEqual(["do sistema", "claro", "escuro"]);
  });

  it("given a browser that blocks storage when choosing a theme then it still applies", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<App engine={inProcessEngine()} seeds={SEEDS} />);

    fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "light" } });

    expect(document.documentElement.dataset["theme"]).toBe("light");
  });
});
