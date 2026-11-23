import { describe, expect, it } from "vitest";

import { aCastInput, aSetup, errorOf, valueOf } from "../../test/support.ts";
import { PRESETS } from "../engine/presets.ts";
import { castProblem, checkSceneSetup, openingProblem } from "./setup.ts";

describe("checkSceneSetup (presets §10.1)", () => {
  it("given a valid setup when checking then the review lists the characters and the player", () => {
    const review = valueOf(checkSceneSetup(PRESETS, aSetup()));

    expect(review.characters.map(({ id, name, player }) => ({ id, name, player }))).toStrictEqual([
      { id: 0, name: "Ana", player: true },
      { id: 1, name: "Bruno", player: false },
    ]);
  });

  it("given the same setup when checking twice then the review is the same, hash included", () => {
    expect(valueOf(checkSceneSetup(PRESETS, aSetup()))).toStrictEqual(
      valueOf(checkSceneSetup(PRESETS, aSetup())),
    );
  });

  it("given another scene seed when checking then the opened scene changes", () => {
    const first = valueOf(checkSceneSetup(PRESETS, aSetup()));
    const other = valueOf(
      checkSceneSetup(PRESETS, aSetup({ seeds: { castSeed: 20261123, sceneSeed: 8 } })),
    );

    expect(other.hash).not.toBe(first.hash);
  });

  it("given positions chosen by hand when checking then the review keeps them", () => {
    const setup = aSetup({ positions: [{ x: 1, y: 1 }, null] });

    expect(valueOf(checkSceneSetup(PRESETS, setup)).characters[0]?.cell).toStrictEqual({
      x: 1,
      y: 1,
    });
  });

  it("given nobody plays when checking then no character is the player's", () => {
    const review = valueOf(checkSceneSetup(PRESETS, aSetup({ player: null })));

    expect(review.characters.map((character) => character.player)).toStrictEqual([false, false]);
  });

  it("given the grid of another place when checking then the positions follow that template", () => {
    expect(checkSceneSetup(PRESETS, aSetup({ positions: [{ x: 2, y: 5 }] })).ok).toBe(true);
    const setup = aSetup({ grid: "vehicle", positions: [{ x: 2, y: 5 }] });

    expect(errorOf(checkSceneSetup(PRESETS, setup))).toStrictEqual([
      openingProblem({ code: "INVALID_POSITION", character: 0 as never }),
    ]);
  });

  it("given a position on a wall when checking then the problem names that character", () => {
    const setup = aSetup({ positions: [null, { x: 0, y: 0 }] });

    expect(errorOf(checkSceneSetup(PRESETS, setup))).toStrictEqual([
      {
        path: "positions.1",
        message: "A posição do personagem 2 não é uma célula atravessável da grade.",
      },
    ]);
  });

  it("given two characters on one cell when checking then the second position is taken", () => {
    const setup = aSetup({
      positions: [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
    });

    expect(errorOf(checkSceneSetup(PRESETS, setup))).toStrictEqual([
      { path: "positions.1", message: "A posição do personagem 2 já está ocupada." },
    ]);
  });

  it("given other presets, a player outside the cast and extra positions then each is a problem", () => {
    const setup = aSetup({ presetsVersion: "0.0.1", player: 2, positions: [null, null, null] });

    expect(errorOf(checkSceneSetup(PRESETS, setup)).map((problem) => problem.path)).toStrictEqual([
      "presetsVersion",
      "player",
      "positions",
    ]);
  });

  it("given other presets when checking then the message names both versions", () => {
    const setup = aSetup({ presetsVersion: "0.0.1" });

    expect(errorOf(checkSceneSetup(PRESETS, setup))[0]?.message).toMatch(
      /^A ficha usa os presets 0\.0\.1; o motor está nos \d+\.\d+\.\d+\.$/,
    );
  });

  it("given a player outside the cast and extra positions when checking then the messages say so", () => {
    const setup = aSetup({ player: 2, positions: [null, null, null] });

    expect(
      errorOf(checkSceneSetup(PRESETS, setup)).map((problem) => problem.message),
    ).toStrictEqual([
      "O personagem do jogador não está no elenco.",
      "Há mais posições do que personagens.",
    ]);
  });

  it("given presets without the place of the grid when checking then the problem names it", () => {
    const presets = {
      ...PRESETS,
      places: PRESETS.places.filter((place) => place.id !== "vehicle"),
    };

    expect(errorOf(checkSceneSetup(presets, aSetup({ grid: "vehicle" })))).toStrictEqual([
      { path: "grid", message: "Os presets não têm o lugar vehicle." },
    ]);
  });

  it("given the last character plays when checking then it is in the cast", () => {
    expect(checkSceneSetup(PRESETS, aSetup({ player: 1 })).ok).toBe(true);
  });

  it("given as many positions as characters when checking then it is accepted", () => {
    expect(checkSceneSetup(PRESETS, aSetup({ positions: [null, null] })).ok).toBe(true);
  });

  it("given a duplicate bond when checking then the problem points at the bond", () => {
    const cast = aCastInput(
      [
        ["Ana", "caretaker"],
        ["Bruno", "rebel"],
      ],
      [
        { a: 0, b: 1, archetype: "siblings" },
        { a: 1, b: 0, archetype: "rivals" },
      ],
    );

    expect(errorOf(checkSceneSetup(PRESETS, aSetup({ cast })))).toStrictEqual([
      { path: "cast.bonds.1", message: "Esse par já tem um laço." },
    ]);
  });

  it("given junk when checking then the schema problems come back with their paths", () => {
    const problems = errorOf(checkSceneSetup(PRESETS, { ...aSetup(), weather: "acid", cast: 3 }));

    expect(problems.map((problem) => problem.path)).toStrictEqual(["cast", "weather"]);
  });

  it("given a cast that is not an object when checking then the message says so", () => {
    const problems = errorOf(checkSceneSetup(PRESETS, { ...aSetup(), cast: null }));

    expect(problems).toStrictEqual([{ path: "cast", message: "o elenco precisa ser um objeto" }]);
  });
});

describe("problems of the engine", () => {
  it("given an INVALID_INPUT error when describing then the engine message is kept", () => {
    expect(
      castProblem({ code: "INVALID_INPUT", path: "characters", message: "too big" }),
    ).toStrictEqual({ path: "cast.characters", message: "Dado inválido no elenco (too big)." });
  });

  it.each([
    ["UNKNOWN_CHARACTER", "O laço cita um personagem que não existe."],
    ["SELF_BOND", "Um personagem não pode ter laço consigo mesmo."],
    ["AUTHOR_OUTSIDE_PAIR", "Quem fez o acontecimento precisa ser do par."],
    ["STRANGERS_WITH_EVENTS", "Desconhecidos não têm acontecimentos em comum."],
    ["IMPOSSIBLE_DRAFT", "Os valores travados não cabem nos acontecimentos do laço."],
    ["TOO_MANY_SPOUSES", "Alguém ficou com mais de um cônjuge."],
    ["TOO_MANY_PARTNERS", "Alguém ficou com mais de um par romântico."],
    ["PARENT_CYCLE", "Alguém seria ancestral de si mesmo."],
    ["FAMILY_CONFLICT", "Um par ficou com dois parentescos diferentes."],
  ] as const)("given a %s error when describing then it reads %s", (code, message) => {
    expect(castProblem({ code, path: "bonds.0", message: "x" })).toStrictEqual({
      path: "cast.bonds.0",
      message,
    });
  });

  it("given an invalid grid when describing then the problem points at the grid", () => {
    expect(openingProblem({ code: "INVALID_GRID", grid: { code: "NO_EXIT" } })).toStrictEqual({
      path: "grid",
      message: "O gabarito da grade é inválido (NO_EXIT).",
    });
  });
});
