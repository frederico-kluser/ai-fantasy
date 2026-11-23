import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SEEDS } from "../../test/support.ts";
import type { BondDraftData, CastView } from "../engine/protocol.ts";
import { GeneratedCast } from "./GeneratedCast.tsx";
import { initialPlayground, type PlaygroundState } from "./model.ts";
import type { PlaygroundAction } from "./reducer.ts";

// Only the component reads the view here; the drafts' values do not matter.
const DRAFT = { aToB: {}, bToA: {}, secrets: [] } as unknown as BondDraftData;

const VIEW: CastView = {
  characters: [
    {
      id: 0,
      name: "Ana",
      dominantDrives: ["company", "care"],
      associations: [
        { tag: "water", valence: -5651 },
        { tag: "fire", valence: 0 },
      ],
    },
    { id: 1, name: "Bia", dominantDrives: ["fun"], associations: [] },
    { id: 2, name: " ", dominantDrives: [], associations: [] },
  ],
  relations: [
    { from: 0, to: 1, labels: ["SIBLING"] },
    { from: 1, to: 0, labels: ["RIVAL", "SIBLING"] },
    { from: 1, to: 5, labels: ["FRIEND"] },
  ],
  drafts: {
    characters: [],
    bonds: [
      { a: 0, b: 1, derived: false, draft: DRAFT },
      { a: 0, b: 2, derived: true, draft: DRAFT },
      { a: 1, b: 2, derived: true, draft: DRAFT },
    ],
  },
  hook: { event: "secret_affair", author: 1, subject: 0, secret: true },
};

function stateWith(fields: Partial<PlaygroundState>): PlaygroundState {
  return { ...initialPlayground({ ...SEEDS }), attempt: 2, generated: VIEW, ...fields };
}

function items(name: string): (string | null)[] {
  return within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

function lock(name: string): HTMLInputElement {
  return within(
    screen.getByRole("group", { name: "Pares acrescentados pela família" }),
  ).getByLabelText<HTMLInputElement>(name);
}

describe("generated cast", () => {
  it("given nothing generated when rendering then nothing shows", () => {
    const { container } = render(
      <GeneratedCast state={stateWith({ generated: null })} dispatch={vi.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("given a generated cast when rendering then the heading names the attempt", () => {
    render(<GeneratedCast state={stateWith({})} dispatch={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Elenco gerado (tentativa 2)",
    );
  });

  it("given the characters when rendering then each shows its drives, fears and attachments", () => {
    render(<GeneratedCast state={stateWith({})} dispatch={vi.fn()} />);

    expect(items("Personagens gerados")).toStrictEqual([
      "Ana: quer companhia, cuidado; medo de água (-5651); apego a fogo (0)",
      "Bia: quer diversão",
      "Personagem 3: quer ",
    ]);
  });

  it("given the relations when rendering then each names both sides and every label", () => {
    render(<GeneratedCast state={stateWith({})} dispatch={vi.fn()} />);

    expect(items("Laços gerados")).toStrictEqual([
      "Ana → Bia: irmão(ã)",
      "Bia → Ana: rival, irmão(ã)",
      "Bia → Personagem 6: amigo(a)",
    ]);
  });

  it("given a secret hook when rendering then it says who did what, in secret", () => {
    render(<GeneratedCast state={stateWith({})} dispatch={vi.fn()} />);

    expect(screen.getByText(/^Gancho de tensão/).textContent).toBe(
      "Gancho de tensão: Bia → Ana, traiu Ana com outra pessoa, às escondidas (em segredo).",
    );
  });

  it("given an open hook when rendering then it does not say secret", () => {
    const view = {
      ...VIEW,
      hook: { event: "stole", author: 0, subject: 1, secret: false },
    } as const;
    render(<GeneratedCast state={stateWith({ generated: view })} dispatch={vi.fn()} />);

    expect(screen.getByText(/^Gancho de tensão/).textContent).toBe(
      "Gancho de tensão: Ana → Bia, roubou.",
    );
  });

  it("given no hook when rendering then no hook shows", () => {
    render(
      <GeneratedCast
        state={stateWith({ generated: { ...VIEW, hook: null } })}
        dispatch={vi.fn()}
      />,
    );

    expect(screen.queryByText(/^Gancho de tensão/)).toBeNull();
  });

  it("given the drafts when rendering then only the pairs the family added can be locked", () => {
    render(<GeneratedCast state={stateWith({})} dispatch={vi.fn()} />);

    expect(
      within(screen.getByRole("group", { name: "Pares acrescentados pela família" }))
        .getAllByRole("checkbox")
        .map((box) => box.parentElement?.textContent),
    ).toStrictEqual(["Travar Ana – Personagem 3", "Travar Bia – Personagem 3"]);
  });

  it("given one derived pair locked when rendering then only its box is checked", () => {
    render(
      <GeneratedCast
        state={stateWith({ derived: [{ a: 0, b: 2, locked: DRAFT }] })}
        dispatch={vi.fn()}
      />,
    );

    expect([
      lock("Travar Ana – Personagem 3").checked,
      lock("Travar Bia – Personagem 3").checked,
    ]).toStrictEqual([true, false]);
  });

  it("given a derived pair when ticking its box then the lock is asked for that pair", () => {
    const dispatch = vi.fn<(action: PlaygroundAction) => void>();
    render(<GeneratedCast state={stateWith({})} dispatch={dispatch} />);

    fireEvent.click(lock("Travar Bia – Personagem 3"));

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "lockDerived", a: 1, b: 2, locked: true }],
    ]);
  });

  it("given no derived pair when rendering then no family group shows", () => {
    const view = {
      ...VIEW,
      drafts: { characters: [], bonds: [{ a: 0, b: 1, derived: false, draft: DRAFT }] },
    };
    render(<GeneratedCast state={stateWith({ generated: view })} dispatch={vi.fn()} />);

    expect(screen.queryByRole("group")).toBeNull();
  });
});
