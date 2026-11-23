import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SEEDS } from "../../test/support.ts";
import { handleRequest } from "../engine/handler.ts";
import { PRESETS } from "../engine/presets.ts";
import type { CastView } from "../engine/protocol.ts";
import { BondFields } from "./BondFields.tsx";
import { CastFields } from "./CastFields.tsx";
import { castInputOf, initialPlayground, newCharacter, type PlaygroundState } from "./model.ts";
import { PositionFields } from "./PositionFields.tsx";
import type { PlaygroundAction } from "./reducer.ts";
import { SceneFields, SeedFields } from "./SceneFields.tsx";

const DUO: PlaygroundState = {
  ...initialPlayground({ ...SEEDS }),
  characters: [
    { ...newCharacter("caretaker"), name: "Ana" },
    { ...newCharacter("rebel"), name: "Bia" },
  ],
  bonds: [{ a: 0, b: 1, archetype: "rivals", events: [], locked: null }],
  positions: [null, null],
};

function viewOf(state: PlaygroundState): CastView {
  const answer = handleRequest(PRESETS, {
    v: 1,
    id: 0,
    kind: "generateCast",
    input: castInputOf(state),
    seeds: state.seeds,
  });
  // The tests generate valid casts only.
  return (answer as { cast: CastView }).cast;
}

function spy() {
  return vi.fn<(action: PlaygroundAction) => void>();
}

function change(label: string, value: string, scope: HTMLElement = document.body): void {
  fireEvent.change(within(scope).getByLabelText(label), { target: { value } });
}

function card(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

function optionsOf(label: string, scope: HTMLElement = document.body): string[] {
  return within(within(scope).getByLabelText(label))
    .getAllByRole("option")
    .map((option) => option.textContent);
}

describe("cast fields", () => {
  it.each([
    ["Nome", "Ana Maria", { name: "Ana Maria" }],
    ["Pronomes", "ela", { pronouns: "ela" }],
    ["Papel na história", "dona", { role: "dona" }],
    ["Descrição", "calma", { description: "calma" }],
    ["Faixa etária", "ELDER", { ageBand: "ELDER" }],
    ["Registro de fala", "ARCHAIC", { speechRegister: "ARCHAIC" }],
    ["Arquétipo", "devout", { archetype: "devout" }],
    ["Estado do dia", "hungry", { dayState: "hungry" }],
    ["Vontade dominante 1", "fun", { drives: ["fun", null] }],
    ["Vontade dominante 2", "justice", { drives: [null, "justice"] }],
    ["Associação", "ATTACHMENT:fire", { association: { tag: "fire", kind: "ATTACHMENT" } }],
  ])("given the field %s when changing it then the character changes", (label, value, changes) => {
    const dispatch = spy();
    render(<CastFields state={DUO} dispatch={dispatch} />);

    change(label, value, card("Personagem 2"));

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "updateCharacter", index: 1, changes }]]);
  });

  it("given a drive picked when choosing the archetype's again then the pick is cleared", () => {
    const dispatch = spy();
    const state = {
      ...DUO,
      characters: [{ ...newCharacter("elder"), name: "Rosa", drives: ["fun", "care"] as const }],
    };
    render(<CastFields state={state} dispatch={dispatch} />);

    change("Vontade dominante 1", "", card("Personagem 1"));

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "updateCharacter", index: 0, changes: { drives: [null, "care"] } }],
    ]);
  });

  it("given a character with choices when rendering then the fields show them", () => {
    const state = {
      ...DUO,
      characters: [
        {
          ...newCharacter("elder"),
          name: "Rosa",
          drives: ["fun", "care"] as const,
          association: { tag: "water", kind: "FEAR" } as const,
        },
      ],
    };
    render(<CastFields state={state} dispatch={spy()} />);

    expect(
      ["Vontade dominante 1", "Vontade dominante 2", "Associação", "Arquétipo"].map(
        (label) => within(card("Personagem 1")).getByLabelText<HTMLSelectElement>(label).value,
      ),
    ).toStrictEqual(["fun", "care", "FEAR:water", "elder"]);
  });

  it("given the association choices when listing then each tag is a fear or an attachment", () => {
    render(<CastFields state={DUO} dispatch={spy()} />);

    expect(optionsOf("Associação", card("Personagem 1")).slice(0, 3)).toStrictEqual([
      "nenhuma",
      "medo de floresta",
      "apego a floresta",
    ]);
  });

  it("given the drive choices when listing then the archetype's come first", () => {
    render(<CastFields state={DUO} dispatch={spy()} />);

    expect(optionsOf("Vontade dominante 1", card("Personagem 1")).slice(0, 2)).toStrictEqual([
      "a do arquétipo",
      "alívio físico",
    ]);
  });

  it("given an unknown value when a select reports it then nothing changes", () => {
    const dispatch = spy();
    render(<CastFields state={DUO} dispatch={dispatch} />);
    const select = within(card("Personagem 1")).getByLabelText("Arquétipo");
    select.append(Object.assign(document.createElement("option"), { value: "wizard" }));

    change("Arquétipo", "wizard", card("Personagem 1"));

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("given a character when removing it then the action names its index", () => {
    const dispatch = spy();
    render(<CastFields state={DUO} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover Bia" }));

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "removeCharacter", index: 1 }]]);
  });

  it("given an archetype chosen when adding then the new character has it", () => {
    const dispatch = spy();
    render(<CastFields state={DUO} dispatch={dispatch} />);

    change("Arquétipo do novo personagem", "trickster");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar personagem" }));

    expect([
      dispatch.mock.calls,
      screen.getByText(/^2 de 8 personagens/).textContent,
    ]).toStrictEqual([
      [[{ type: "addCharacter", archetype: "trickster" }]],
      "2 de 8 personagens. Arquétipo: malandro(a).",
    ]);
  });

  it("given eight characters when adding then the button is disabled", () => {
    const state = { ...DUO, characters: Array.from({ length: 8 }, () => newCharacter("child")) };
    render(<CastFields state={state} dispatch={spy()} />);

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Adicionar personagem" }).disabled,
    ).toBe(true);
  });

  it("given seven characters when adding then the button is enabled", () => {
    const state = { ...DUO, characters: Array.from({ length: 7 }, () => newCharacter("child")) };
    render(<CastFields state={state} dispatch={spy()} />);

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Adicionar personagem" }).disabled,
    ).toBe(false);
  });

  it("given a generated cast when locking a character then the action asks for the lock", () => {
    const dispatch = spy();
    render(<CastFields state={{ ...DUO, generated: viewOf(DUO) }} dispatch={dispatch} />);

    fireEvent.click(within(card("Personagem 1")).getByLabelText("Travar valores sorteados"));

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "lockCharacter", index: 0, locked: true }],
    ]);
  });

  it("given a generated cast when showing a character then its lock is enabled", () => {
    render(<CastFields state={{ ...DUO, generated: viewOf(DUO) }} dispatch={spy()} />);

    expect(
      within(card("Personagem 1")).getByLabelText<HTMLInputElement>("Travar valores sorteados")
        .disabled,
    ).toBe(false);
  });

  it("given a locked character and nothing generated when showing it then its lock is enabled", () => {
    const draft = viewOf(DUO).drafts.characters[0] ?? null;
    render(
      <CastFields
        state={{ ...DUO, characters: [{ ...newCharacter("elder"), name: "R", locked: draft }] }}
        dispatch={spy()}
      />,
    );

    expect(
      within(card("Personagem 1")).getByLabelText<HTMLInputElement>("Travar valores sorteados")
        .disabled,
    ).toBe(false);
  });

  it("given nothing generated when showing a character then its lock is disabled", () => {
    render(<CastFields state={DUO} dispatch={spy()} />);

    expect(
      within(card("Personagem 1")).getByLabelText<HTMLInputElement>("Travar valores sorteados")
        .disabled,
    ).toBe(true);
  });

  it("given a locked character with the cast changed when showing it then it can still be unlocked", () => {
    const draft = viewOf(DUO).drafts.characters[0] ?? null;
    const dispatch = spy();
    render(
      <CastFields
        state={{ ...DUO, characters: [{ ...newCharacter("elder"), name: "R", locked: draft }] }}
        dispatch={dispatch}
      />,
    );

    fireEvent.click(within(card("Personagem 1")).getByLabelText("Travar valores sorteados"));

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "lockCharacter", index: 0, locked: false }],
    ]);
  });
});

describe("bond fields", () => {
  it.each([
    ["Lado A", "1", { a: 1 }],
    ["Lado B", "0", { b: 0 }],
    ["Arquétipo do laço", "enemies", { archetype: "enemies" }],
    ["Acontecimento 1", "stole", { events: [{ event: "stole", author: 0 }] }],
  ])("given the field %s when changing it then the bond changes", (label, value, changes) => {
    const dispatch = spy();
    render(<BondFields state={DUO} dispatch={dispatch} />);

    change(label, value, card("Laço 1"));

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "updateBond", index: 0, changes }]]);
  });

  it("given an event when choosing who did it then the author changes", () => {
    const dispatch = spy();
    const state = {
      ...DUO,
      bonds: [
        { a: 0, b: 1, archetype: "rivals", events: [{ event: "stole", author: 0 }], locked: null },
      ],
    } as const;
    render(<BondFields state={state} dispatch={dispatch} />);

    change("Quem fez o acontecimento 1", "1", card("Laço 1"));

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "updateBond", index: 0, changes: { events: [{ event: "stole", author: 1 }] } }],
    ]);
  });

  it("given an event when emptying it then the bond has no events and keeps the author choice hidden", () => {
    const dispatch = spy();
    const state = {
      ...DUO,
      bonds: [
        { a: 0, b: 1, archetype: "rivals", events: [{ event: "stole", author: 1 }], locked: null },
      ],
    } as const;
    render(<BondFields state={state} dispatch={dispatch} />);

    change("Acontecimento 1", "", card("Laço 1"));

    expect([
      dispatch.mock.calls,
      within(card("Laço 1")).queryByLabelText("Quem fez o acontecimento 2"),
    ]).toStrictEqual([[[{ type: "updateBond", index: 0, changes: { events: [] } }]], null]);
  });

  it("given an event when listing who did it then the two sides are named", () => {
    const state = {
      ...DUO,
      bonds: [
        { a: 1, b: 0, archetype: "rivals", events: [{ event: "stole", author: 1 }], locked: null },
      ],
    } as const;
    render(<BondFields state={state} dispatch={spy()} />);

    expect(optionsOf("Quem fez o acontecimento 1", card("Laço 1"))).toStrictEqual(["Bia", "Ana"]);
  });

  it("given a second event slot when choosing an event then its author is side A", () => {
    const dispatch = spy();
    const state = {
      ...DUO,
      bonds: [
        { a: 1, b: 0, archetype: "rivals", events: [{ event: "stole", author: 0 }], locked: null },
      ],
    } as const;
    render(<BondFields state={state} dispatch={dispatch} />);

    change("Acontecimento 2", "forgave", card("Laço 1"));

    expect(dispatch.mock.calls[0]?.[0]).toStrictEqual({
      type: "updateBond",
      index: 0,
      changes: {
        events: [
          { event: "stole", author: 0 },
          { event: "forgave", author: 1 },
        ],
      },
    });
  });

  it("given a bond when removing it then the action names its index", () => {
    const dispatch = spy();
    render(<BondFields state={DUO} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover laço 1" }));

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "removeBond", index: 0 }]]);
  });

  it("given two characters when adding a bond then the action is sent", () => {
    const dispatch = spy();
    render(<BondFields state={DUO} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar laço" }));

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "addBond" }]]);
  });

  it("given one character when showing the bonds then adding is disabled", () => {
    render(
      <BondFields
        state={{ ...DUO, characters: [newCharacter("child")], bonds: [] }}
        dispatch={spy()}
      />,
    );

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Adicionar laço" }).disabled).toBe(
      true,
    );
  });

  it("given a generated bond when editing an axis then the edit names the side and the axis", () => {
    const dispatch = spy();
    render(<BondFields state={{ ...DUO, generated: viewOf(DUO) }} dispatch={dispatch} />);

    change("medo de B, Ana → Bia", "77", card("Laço 1"));

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "editBondAxis", index: 0, side: "aToB", axis: "fearOf", value: 77 }],
    ]);
  });

  it("given a generated bond when showing it then the axes of both sides show the drawn values", () => {
    const view = viewOf(DUO);
    render(<BondFields state={{ ...DUO, generated: view }} dispatch={spy()} />);

    expect([
      within(card("Laço 1")).getByLabelText<HTMLInputElement>("ressentimento, Ana → Bia").value,
      within(card("Laço 1")).getByLabelText<HTMLInputElement>("ressentimento, Bia → Ana").value,
    ]).toStrictEqual([
      String(view.drafts.bonds[0]?.draft.aToB.resentment),
      String(view.drafts.bonds[0]?.draft.bToA.resentment),
    ]);
  });

  it("given a generated bond when locking it then the action asks for the lock", () => {
    const dispatch = spy();
    render(<BondFields state={{ ...DUO, generated: viewOf(DUO) }} dispatch={dispatch} />);

    fireEvent.click(within(card("Laço 1")).getByLabelText("Travar laço"));

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "lockBond", index: 0, locked: true }]]);
  });
});

describe("scene fields", () => {
  it.each([
    ["Lugar", "vehicle", { place: "vehicle" }],
    ["Gabarito da grade", "home", { grid: "home" }],
    ["Tag natural do lugar", "water", { naturalTag: "water" }],
    ["Tag natural do lugar", "", { naturalTag: null }],
    ["Clima", "snow", { weather: "snow" }],
    ["Horário", "07:15", { startMinute: 435 }],
  ])(
    "given the field %s when changing it to %j then the scene changes",
    (label, value, changes) => {
      const dispatch = spy();
      render(<SceneFields state={DUO} dispatch={dispatch} />);

      change(label, value);

      expect(dispatch.mock.calls).toStrictEqual([[{ type: "setScene", changes }]]);
    },
  );

  it("given an empty time when changing it then nothing changes", () => {
    const dispatch = spy();
    render(<SceneFields state={DUO} dispatch={dispatch} />);

    change("Horário", "");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("given the start minute when rendering then the time and the phase of the day show", () => {
    render(<SceneFields state={{ ...DUO, startMinute: 900 }} dispatch={spy()} />);

    expect([
      screen.getByLabelText<HTMLInputElement>("Horário").value,
      screen.getByText(/^Fase do dia/).textContent,
    ]).toStrictEqual(["15:00", "Fase do dia: tarde"]);
  });

  it("given an unknown place when a select reports it then nothing changes", () => {
    const dispatch = spy();
    render(<SceneFields state={DUO} dispatch={dispatch} />);
    screen
      .getByLabelText("Lugar")
      .append(Object.assign(document.createElement("option"), { value: "moon" }));

    change("Lugar", "moon");

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("seed fields", () => {
  it.each([
    ["Seed do elenco", "42", { castSeed: 42 }],
    ["Seed da cena", "4294967295", { sceneSeed: 4294967295 }],
    ["Seed da cena", "0", { sceneSeed: 0 }],
  ])("given %s when typing %s then the seed changes", (label, value, seeds) => {
    const dispatch = spy();
    render(<SeedFields state={DUO} dispatch={dispatch} />);

    change(label, value);

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "setSeeds", seeds }]]);
  });

  it.each(["", "-1", "4294967296", "1.5"])(
    "given the seed text %j when typing then nothing changes",
    (value) => {
      const dispatch = spy();
      render(<SeedFields state={DUO} dispatch={dispatch} />);

      change("Seed do elenco", value);

      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["Sortear seed do elenco", "castSeed"],
    ["Sortear seed da cena", "sceneSeed"],
  ])("given the button %s when clicking then a new seed is set", (name, key) => {
    const dispatch = spy();
    render(<SeedFields state={DUO} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole("button", { name }));

    expect(Object.keys(dispatch.mock.calls[0]?.[0] ?? {})).toStrictEqual(["type", "seeds"]);
    expect(Object.keys((dispatch.mock.calls[0]?.[0] as { seeds: object }).seeds)).toStrictEqual([
      key,
    ]);
  });

  it("given the seeds when rendering then both show", () => {
    render(<SeedFields state={DUO} dispatch={spy()} />);

    expect([
      screen.getByLabelText<HTMLInputElement>("Seed do elenco").value,
      screen.getByLabelText<HTMLInputElement>("Seed da cena").value,
    ]).toStrictEqual([String(SEEDS.castSeed), String(SEEDS.sceneSeed)]);
  });
});

describe("position fields", () => {
  it("given a cell when choosing it then the character's position is set", () => {
    const dispatch = spy();
    render(<PositionFields state={DUO} dispatch={dispatch} />);

    change("Posição de Bia", "2,5");

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "setPosition", index: 1, position: { x: 2, y: 5 } }],
    ]);
  });

  it("given a position when choosing to draw then it goes back to drawn", () => {
    const dispatch = spy();
    render(
      <PositionFields state={{ ...DUO, positions: [{ x: 1, y: 1 }, null] }} dispatch={dispatch} />,
    );

    change("Posição de Ana", "");

    expect(dispatch.mock.calls).toStrictEqual([
      [{ type: "setPosition", index: 0, position: null }],
    ]);
  });

  it("given the vehicle grid when listing cells then the drawn option and the passable cells show", () => {
    render(<PositionFields state={{ ...DUO, grid: "vehicle" }} dispatch={spy()} />);

    expect(optionsOf("Posição de Ana").slice(0, 3)).toStrictEqual([
      "sortear na abertura",
      "(0, 1)",
      "(1, 1)",
    ]);
  });

  it("given a position by hand when drawing the grid then its number marks the cell", () => {
    render(
      <PositionFields
        state={{ ...DUO, grid: "vehicle", positions: [{ x: 1, y: 1 }, null] }}
        dispatch={spy()}
      />,
    );

    expect(document.querySelector("pre")?.textContent).toBe(
      "#==####==#\nd1.......#\n#........d\n#==####==#",
    );
  });

  it.each([
    ["1", 1],
    ["", null],
  ])("given the player choice %j when choosing then the player is set", (value, player) => {
    const dispatch = spy();
    render(<PositionFields state={{ ...DUO, player: 0 }} dispatch={dispatch} />);

    change("Personagem do jogador", value);

    expect(dispatch.mock.calls).toStrictEqual([[{ type: "setPlayer", player }]]);
  });

  it("given the player choices when listing then watching comes first", () => {
    render(<PositionFields state={DUO} dispatch={spy()} />);

    expect(optionsOf("Personagem do jogador")).toStrictEqual([
      "ninguém (só assistir)",
      "Ana",
      "Bia",
    ]);
  });
});
