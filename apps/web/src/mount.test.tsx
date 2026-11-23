import { act, within } from "@testing-library/react";
import { describe, expect, it, onTestFinished } from "vitest";

import { mountApp } from "./mount.tsx";

describe("mounting the site", () => {
  it("given a container when mounting then the start page renders inside it", async () => {
    const container = document.createElement("div");
    document.body.append(container);

    const root = await act(() => mountApp(container));
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
    });

    expect(within(container).getByRole("heading", { level: 1 }).textContent).toBe("AI Fantasy");
  });

  it("given no container when mounting then it fails with an error and a solution", () => {
    expect(() => mountApp(null)).toThrow(
      'Erro: elemento #root ausente — Solução: restaure <div id="root"></div> em apps/web/index.html.',
    );
  });
});
