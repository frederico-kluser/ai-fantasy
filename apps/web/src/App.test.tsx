import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App.tsx";

describe("start page", () => {
  it("given the start page when rendering then AI Fantasy is the main heading", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("AI Fantasy");
  });

  it("given the start page when rendering then it says what the product is and names the engine", () => {
    render(<App />);

    expect(screen.getByRole("paragraph").textContent).toBe(
      "Simulador de conversas com NPCs que simulam pessoas, movido pelo Hermeneutic Core.",
    );
  });
});
