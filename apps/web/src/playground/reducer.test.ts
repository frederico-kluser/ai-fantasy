import { describe, expect, it } from "vitest";

import { SEEDS } from "../../test/support.ts";
import { handleRequest } from "../engine/handler.ts";
import { PRESETS } from "../engine/presets.ts";
import type { CastView } from "../engine/protocol.ts";
import { castInputOf, initialPlayground, newCharacter, type PlaygroundState } from "./model.ts";
import { playgroundReducer, type PlaygroundAction } from "./reducer.ts";

function run(state: PlaygroundState, ...actions: PlaygroundAction[]): PlaygroundState {
  return actions.reduce(playgroundReducer, state);
}

/** The view the worker would answer for the form, as the page would receive it. */
function generatedFor(state: PlaygroundState): CastView {
  const response = handleRequest(PRESETS, {
    v: 1,
    id: 0,
    kind: "generateCast",
    input: castInputOf(state),
    seeds: state.seeds,
  });
  // The tests generate valid casts only.
  return (response as { cast: CastView }).cast;
}

function generate(state: PlaygroundState, attempt = state.attempt): PlaygroundState {
  const next = { ...state, attempt };
  return playgroundReducer(state, {
    type: "generated",
    view: generatedFor(next),
    attempt,
    revision: state.revision,
  });
}

const TRIO = run(
  initialPlayground({ ...SEEDS }),
  { type: "addCharacter", archetype: "merchant" },
  { type: "addCharacter", archetype: "rebel" },
  { type: "addCharacter", archetype: "elder" },
  { type: "updateCharacter", index: 0, changes: { name: "Ana" } },
  { type: "updateCharacter", index: 1, changes: { name: "Bia" } },
  { type: "updateCharacter", index: 2, changes: { name: "Caio" } },
  { type: "addBond" },
  { type: "addBond" },
  { type: "updateBond", index: 1, changes: { a: 1, b: 2, archetype: "rivals" } },
);

describe("playgroundReducer: cast", () => {
  it("given an archetype when adding a character then it joins unnamed with no position", () => {
    const state = run(initialPlayground({ ...SEEDS }), {
      type: "addCharacter",
      archetype: "child",
    });

    expect([state.characters, state.positions]).toStrictEqual([[newCharacter("child")], [null]]);
  });

  it("given a full cast when adding a character then nothing changes", () => {
    const eight = run(
      initialPlayground({ ...SEEDS }),
      ...Array.from({ length: 8 }, (): PlaygroundAction => ({
        type: "addCharacter",
        archetype: "child",
      })),
    );

    expect(run(eight, { type: "addCharacter", archetype: "elder" })).toBe(eight);
  });

  it("given two characters when adding a bond then it joins the first two as acquaintances", () => {
    expect(TRIO.bonds[0]).toStrictEqual({
      a: 0,
      b: 1,
      archetype: "acquaintances",
      events: [],
      locked: null,
    });
  });

  it("given one character when adding a bond then nothing changes", () => {
    const one = run(initialPlayground({ ...SEEDS }), { type: "addCharacter", archetype: "child" });

    expect(run(one, { type: "addBond" })).toBe(one);
  });

  it("given a character removed then bonds touching it go and the others are reindexed", () => {
    const state = run(
      TRIO,
      { type: "updateBond", index: 1, changes: { events: [{ event: "stole", author: 2 }] } },
      { type: "removeCharacter", index: 0 },
    );

    expect(state.bonds).toStrictEqual([
      { a: 0, b: 1, archetype: "rivals", events: [{ event: "stole", author: 1 }], locked: null },
    ]);
  });

  it("given a character removed then the names, positions and player follow", () => {
    const state = run(
      TRIO,
      { type: "setPosition", index: 2, position: { x: 3, y: 1 } },
      { type: "setPlayer", player: 2 },
      { type: "removeCharacter", index: 1 },
    );

    expect([state.characters.map((c) => c.name), state.positions, state.player]).toStrictEqual([
      ["Ana", "Caio"],
      [null, { x: 3, y: 1 }],
      1,
    ]);
  });

  it("given the player removed then nobody plays", () => {
    const state = run(
      TRIO,
      { type: "setPlayer", player: 1 },
      { type: "removeCharacter", index: 1 },
    );

    expect(state.player).toBeNull();
  });

  it("given a character before the player stays when removing a later one then the player keeps its id", () => {
    const state = run(
      TRIO,
      { type: "setPlayer", player: 0 },
      { type: "removeCharacter", index: 2 },
    );

    expect(state.player).toBe(0);
  });

  it("given a change to the cast when generated then the generated view is cleared and the revision moves", () => {
    const generated = generate(TRIO);

    const state = run(generated, {
      type: "updateCharacter",
      index: 0,
      changes: { name: "Ana Maria" },
    });

    expect([generated.generated === null, state.generated, state.revision]).toStrictEqual([
      false,
      null,
      TRIO.revision + 1,
    ]);
  });

  it("given a generation of an older revision when it arrives then it is dropped", () => {
    const view = generatedFor(TRIO);
    const changed = run(TRIO, {
      type: "updateCharacter",
      index: 0,
      changes: { name: "Ana Maria" },
    });

    const state = run(changed, { type: "generated", view, attempt: 0, revision: TRIO.revision });

    expect(state).toBe(changed);
  });
});

describe("playgroundReducer: locks", () => {
  it("given a cast seed when regenerating bonds with one locked then the locked bond stays", () => {
    const first = generate(TRIO);
    const locked = run(first, { type: "lockBond", index: 0, locked: true });

    const again = generate(locked, locked.attempt + 1);

    expect([again.attempt, again.generated?.drafts.bonds[0]?.draft]).toStrictEqual([
      1,
      first.generated?.drafts.bonds[0]?.draft,
    ]);
    expect(again.generated?.drafts.bonds[1]?.draft).not.toStrictEqual(
      first.generated?.drafts.bonds[1]?.draft,
    );
  });

  it("given a generated character when locking then its drawn values are kept; unlocking clears them", () => {
    const first = generate(TRIO);
    const locked = run(first, { type: "lockCharacter", index: 1, locked: true });
    const unlocked = run(locked, { type: "lockCharacter", index: 1, locked: false });

    expect([locked.characters[1]?.locked, unlocked.characters[1]?.locked]).toStrictEqual([
      first.generated?.drafts.characters[1],
      null,
    ]);
  });

  it("given nothing generated when locking then nothing changes", () => {
    expect([
      run(TRIO, { type: "lockBond", index: 0, locked: true }),
      run(TRIO, { type: "lockCharacter", index: 0, locked: true }),
    ]).toStrictEqual([TRIO, TRIO]);
  });

  it.each([
    [{ archetype: "devout" }],
    [{ drives: ["fun", null] }],
    [{ association: { tag: "fire", kind: "ATTACHMENT" } }],
  ] as const)("given a locked character when changing %j then it unlocks", (changes) => {
    const locked = run(generate(TRIO), { type: "lockCharacter", index: 0, locked: true });

    expect(
      run(locked, { type: "updateCharacter", index: 0, changes }).characters[0]?.locked,
    ).toBeNull();
  });

  it("given a locked character when renaming then it stays locked", () => {
    const locked = run(generate(TRIO), { type: "lockCharacter", index: 0, locked: true });

    expect(
      run(locked, { type: "updateCharacter", index: 0, changes: { name: "Outra" } }).characters[0]
        ?.locked,
    ).not.toBeNull();
  });

  it.each([
    [{ archetype: "enemies" }],
    [{ events: [{ event: "stole", author: 0 }] }],
    [{ b: 2 }],
  ] as const)("given a locked bond when changing %j then it unlocks", (changes) => {
    const locked = run(generate(TRIO), { type: "lockBond", index: 0, locked: true });

    expect(run(locked, { type: "updateBond", index: 0, changes }).bonds[0]?.locked).toBeNull();
  });

  it("given a generated bond when editing an axis then the bond locks with the edited value", () => {
    const first = generate(TRIO);

    const state = run(first, {
      type: "editBondAxis",
      index: 0,
      side: "bToA",
      axis: "trust",
      value: 4321,
    });

    expect(state.bonds[0]?.locked).toStrictEqual({
      ...first.generated?.drafts.bonds[0]?.draft,
      bToA: { ...first.generated?.drafts.bonds[0]?.draft.bToA, trust: 4321 },
    });
  });

  it.each([
    [-5, 0],
    [12000, 10000],
    [10000, 10000],
    [0, 0],
  ])("given the axis value %i when editing then it is kept as %i", (value, kept) => {
    const state = run(generate(TRIO), {
      type: "editBondAxis",
      index: 0,
      side: "aToB",
      axis: "affection",
      value,
    });

    expect(state.bonds[0]?.locked?.aToB.affection).toBe(kept);
  });

  it("given a locked bond when editing an axis then the other edits stay", () => {
    const state = run(
      generate(TRIO),
      { type: "editBondAxis", index: 0, side: "aToB", axis: "affection", value: 1 },
      { type: "editBondAxis", index: 0, side: "aToB", axis: "trust", value: 2 },
    );

    expect([
      state.bonds[0]?.locked?.aToB.affection,
      state.bonds[0]?.locked?.aToB.trust,
    ]).toStrictEqual([1, 2]);
  });

  it("given nothing generated when editing an axis then nothing changes", () => {
    expect(
      run(TRIO, { type: "editBondAxis", index: 0, side: "aToB", axis: "trust", value: 1 }),
    ).toBe(TRIO);
  });
});

const FAMILY = run(
  initialPlayground({ ...SEEDS }),
  { type: "addCharacter", archetype: "elder" },
  { type: "addCharacter", archetype: "caretaker" },
  { type: "addCharacter", archetype: "child" },
  { type: "updateCharacter", index: 0, changes: { name: "Rosa" } },
  { type: "updateCharacter", index: 1, changes: { name: "Marta" } },
  { type: "updateCharacter", index: 2, changes: { name: "Joca" } },
  { type: "addBond" },
  { type: "addBond" },
  { type: "updateBond", index: 0, changes: { archetype: "parent_child" } },
  { type: "updateBond", index: 1, changes: { a: 1, b: 2, archetype: "parent_child" } },
);

function derivedDraft(state: PlaygroundState) {
  return state.generated?.drafts.bonds.find((entry) => entry.derived)?.draft;
}

describe("playgroundReducer: derived pairs", () => {
  it("given a family cast when regenerating with the derived pair locked then its draft stays", () => {
    const first = generate(FAMILY);
    const locked = run(first, { type: "lockDerived", a: 0, b: 2, locked: true });

    const again = generate(locked, 1);

    expect([locked.derived, derivedDraft(again)]).toStrictEqual([
      [{ a: 0, b: 2, locked: derivedDraft(first) }],
      derivedDraft(first),
    ]);
  });

  it("given a family cast when regenerating without locks then the derived pair is drawn again", () => {
    const first = generate(FAMILY);

    expect(derivedDraft(generate(first, 1))).not.toStrictEqual(derivedDraft(first));
  });

  it("given a derived pair locked when unlocking then the lock goes away", () => {
    const locked = run(generate(FAMILY), { type: "lockDerived", a: 0, b: 2, locked: true });

    expect(run(locked, { type: "lockDerived", a: 0, b: 2, locked: false }).derived).toStrictEqual(
      [],
    );
  });

  it("given a derived pair locked when locking it again then it is kept once", () => {
    const locked = run(generate(FAMILY), { type: "lockDerived", a: 0, b: 2, locked: true });

    expect(run(locked, { type: "lockDerived", a: 0, b: 2, locked: true }).derived).toHaveLength(1);
  });

  it("given a pair the family did not add when locking then nothing changes", () => {
    const first = generate(FAMILY);

    expect(run(first, { type: "lockDerived", a: 0, b: 1, locked: true })).toBe(first);
  });

  it("given nothing generated when locking a derived pair then nothing changes", () => {
    expect(run(FAMILY, { type: "lockDerived", a: 0, b: 2, locked: true })).toBe(FAMILY);
  });

  it.each([
    { type: "updateBond", index: 0, changes: { archetype: "siblings" } },
    { type: "removeBond", index: 0 },
    { type: "addBond" },
    { type: "removeCharacter", index: 2 },
  ] as const)(
    "given a derived pair locked when the graph changes by $type then the lock goes away",
    (action) => {
      const locked = run(generate(FAMILY), { type: "lockDerived", a: 0, b: 2, locked: true });

      expect(run(locked, action).derived).toStrictEqual([]);
    },
  );

  it("given a derived pair locked when renaming then the lock stays", () => {
    const locked = run(generate(FAMILY), { type: "lockDerived", a: 0, b: 2, locked: true });

    expect(
      run(locked, { type: "updateCharacter", index: 0, changes: { name: "Rosa Maria" } }).derived,
    ).toHaveLength(1);
  });
});

const CLAN = run(
  initialPlayground({ ...SEEDS }),
  { type: "addCharacter", archetype: "elder" },
  { type: "addCharacter", archetype: "caretaker" },
  { type: "addCharacter", archetype: "child" },
  { type: "addCharacter", archetype: "rebel" },
  { type: "updateCharacter", index: 0, changes: { name: "Rosa" } },
  { type: "updateCharacter", index: 1, changes: { name: "Marta" } },
  { type: "updateCharacter", index: 2, changes: { name: "Joca" } },
  { type: "updateCharacter", index: 3, changes: { name: "Lia" } },
  { type: "addBond" },
  { type: "addBond" },
  { type: "addBond" },
  { type: "updateBond", index: 0, changes: { archetype: "parent_child" } },
  { type: "updateBond", index: 1, changes: { a: 1, b: 2, archetype: "parent_child" } },
  { type: "updateBond", index: 2, changes: { a: 1, b: 3, archetype: "parent_child" } },
);

describe("playgroundReducer: several derived pairs", () => {
  it("given a clan when generating then the family adds three pairs", () => {
    expect(
      generate(CLAN)
        .generated?.drafts.bonds.filter((entry) => entry.derived)
        .map(({ a, b }) => [a, b]),
    ).toStrictEqual([
      [0, 2],
      [0, 3],
      [2, 3],
    ]);
  });

  it("given two derived pairs locked when unlocking one then the other stays", () => {
    const state = run(
      generate(CLAN),
      { type: "lockDerived", a: 0, b: 2, locked: true },
      { type: "lockDerived", a: 0, b: 3, locked: true },
      { type: "lockDerived", a: 0, b: 2, locked: false },
    );

    expect(state.derived.map(({ a, b }) => [a, b])).toStrictEqual([[0, 3]]);
  });

  it("given a pair sharing only its second side with a derived pair when locking then nothing changes", () => {
    const first = generate(CLAN);

    expect(run(first, { type: "lockDerived", a: 1, b: 3, locked: true })).toBe(first);
  });

  it("given a pair sharing only its first side with a derived pair when locking then nothing changes", () => {
    const first = generate(CLAN);

    expect(run(first, { type: "lockDerived", a: 0, b: 1, locked: true })).toBe(first);
  });
});

describe("playgroundReducer: out of range", () => {
  it("given the second side of a bond removed then the bond goes", () => {
    expect(run(TRIO, { type: "removeCharacter", index: 1 }).bonds).toStrictEqual([]);
  });

  it.each([
    { type: "editBondAxis", index: 5, side: "aToB", axis: "trust", value: 1 },
    { type: "lockBond", index: 5, locked: true },
    { type: "lockCharacter", index: 5, locked: true },
    { type: "lockDerived", a: 5, b: 6, locked: true },
  ] as const)("given a generated cast when $type names no item then nothing changes", (action) => {
    const first = generate(TRIO);

    expect(run(first, action)).toBe(first);
  });
});

describe("playgroundReducer: scene and seeds", () => {
  it("given another cast seed when setting it then the generation starts over", () => {
    const state = run(generate(TRIO, 3), { type: "setSeeds", seeds: { castSeed: 1 } });

    expect([state.seeds, state.attempt, state.generated]).toStrictEqual([
      { castSeed: 1, sceneSeed: SEEDS.sceneSeed },
      0,
      null,
    ]);
  });

  it("given another scene seed when setting it then the generated cast stays", () => {
    const generated = generate(TRIO);

    const state = run(generated, { type: "setSeeds", seeds: { sceneSeed: 1 } });

    expect([state.seeds.sceneSeed, state.generated]).toStrictEqual([1, generated.generated]);
  });

  it("given another place when choosing it then its grid comes with it and the positions reset", () => {
    const state = run(
      TRIO,
      { type: "setPosition", index: 0, position: { x: 1, y: 1 } },
      { type: "setScene", changes: { place: "vehicle" } },
    );

    expect([state.place, state.grid, state.positions]).toStrictEqual([
      "vehicle",
      "vehicle",
      [null, null, null],
    ]);
  });

  it("given another grid when choosing it then the place stays and the positions reset", () => {
    const state = run(
      TRIO,
      { type: "setPosition", index: 0, position: { x: 1, y: 1 } },
      { type: "setScene", changes: { grid: "home" } },
    );

    expect([state.place, state.grid, state.positions]).toStrictEqual([
      "social_interior",
      "home",
      [null, null, null],
    ]);
  });

  it("given the weather, time and tag when choosing them then the positions stay", () => {
    const state = run(
      TRIO,
      { type: "setPosition", index: 0, position: { x: 1, y: 1 } },
      { type: "setScene", changes: { weather: "storm", startMinute: 60, naturalTag: "water" } },
    );

    expect([state.weather, state.startMinute, state.naturalTag, state.positions[0]]).toStrictEqual([
      "storm",
      60,
      "water",
      { x: 1, y: 1 },
    ]);
  });

  it("given a bond removed then the others keep their order", () => {
    expect(
      run(TRIO, { type: "removeBond", index: 0 }).bonds.map((bond) => bond.archetype),
    ).toStrictEqual(["rivals"]);
  });

  it("given the cast input of the form then it validates in the engine", () => {
    expect(
      handleRequest(PRESETS, {
        v: 1,
        id: 0,
        kind: "generateCast",
        input: castInputOf(TRIO),
        seeds: SEEDS,
      }).ok,
    ).toBe(true);
  });
});
