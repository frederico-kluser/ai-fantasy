import { describe, expect, it } from "vitest";

import { greatestNeed } from "../character/body.ts";
import type { CharacterId } from "../domain/ids.ts";
import { createDrawer } from "../rng/drawer.ts";
import { createRngState } from "../rng/state.ts";
import { parseGridSpec } from "../space/grid-spec.ts";
import {
  aBondSpec,
  aCastInput,
  characterOf,
  defaultPresets,
  errorOf,
  valueOf,
} from "../../test/support/cast.ts";
import { generateCast } from "./cast.ts";
import { drawCell, openScene, type SceneOpening } from "./opening.ts";

const presets = defaultPresets();
const SEEDS = { castSeed: 3, sceneSeed: 4 };
const generated = valueOf(
  generateCast(
    presets,
    aCastInput(["elder", "child", "rebel"], [aBondSpec(0, 1, "parent_child")]),
    SEEDS,
  ),
);
const { characters } = generated.cast;

/** A 10 × 3 room: walls around a row of floor, one exit and eight suggested starts (cells 10..17). */
const ROOM = {
  rows: ["##########", ".........d", "##########"],
  exits: [{ x: 9, y: 1 }],
  roofed: "ALL",
  starts: [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, y: 1 })),
} as const;

const ROOM_GRID = valueOf(parseGridSpec(ROOM));

function opened(opening: SceneOpening, sceneSeed = SEEDS.sceneSeed) {
  return valueOf(openScene(presets, characters, opening, createRngState({ ...SEEDS, sceneSeed })));
}

describe("openScene (presets §10.1)", () => {
  it("given a tired character when opening then fatigue is in 6000..7500 and the other needs follow rested", () => {
    const elder = characterOf(opened({ grid: ROOM, dayStates: ["tired"] }).characters, 0);

    expect(elder.body.fatigue).toBeGreaterThanOrEqual(6000);
    expect(elder.body.fatigue).toBeLessThanOrEqual(7500);
    expect(Math.max(elder.body.hunger, elder.body.thirst, elder.body.bladder)).toBeLessThanOrEqual(
      2000,
    );
    expect(elder.body.thermal).toBe(0);
  });

  it("given a cheerful character when opening then joy is 4000 and the other emotions are the baselines", () => {
    const elder = characterOf(opened({ grid: ROOM, dayStates: ["cheerful"] }).characters, 0);

    expect(elder.emotions).toStrictEqual({ ...elder.baselines, joy: 4000 });
  });

  it("given a hungry character when opening then physical relief is computed from the body", () => {
    const elder = characterOf(opened({ grid: ROOM, dayStates: ["hungry"] }).characters, 0);

    expect(elder.drives.deficits.physical_relief).toBe(
      Math.max(0, (greatestNeed(elder.body) - 5000) * 2),
    );
  });

  it("given the same scene seed when opening twice then the scenes are identical and only setup was drawn", () => {
    const first = opened({ grid: ROOM });

    expect(opened({ grid: ROOM })).toStrictEqual(first);
    expect(new Set(first.records.map((record) => record.stream))).toStrictEqual(new Set(["setup"]));
  });

  it("given another scene seed when opening then the body changes but not the cast's traits", () => {
    const first = characterOf(opened({ grid: ROOM }).characters, 2);
    const other = characterOf(opened({ grid: ROOM }, 77).characters, 2);

    expect(other.body).not.toStrictEqual(first.body);
    expect(other.traits).toStrictEqual(first.traits);
  });

  it("given no positions when opening then every character stands on a distinct suggested start", () => {
    const cells = opened({ grid: ROOM }).characters.map((character) => character.cell);

    expect(new Set(cells).size).toBe(3);
    expect(cells.every((cell) => cell >= 10 && cell <= 17)).toBe(true);
  });

  it("given a position chosen by hand when opening then it is kept and the others avoid it", () => {
    const scene = opened({ grid: ROOM, positions: [null, { x: 8, y: 1 }] });

    expect(characterOf(scene.characters, 1).cell).toBe(18);
    expect(new Set(scene.characters.map((character) => character.cell)).size).toBe(3);
  });

  it.each([
    [[{ x: 0, y: 0 }], "INVALID_POSITION", 0],
    [[{ x: 12, y: 1 }], "INVALID_POSITION", 0],
    [[{ x: 10, y: 0 }], "INVALID_POSITION", 0],
    [[{ x: -1, y: 1 }], "INVALID_POSITION", 0],
    [
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
      "TAKEN_POSITION",
      1,
    ],
  ] as const)(
    "given the positions %j when opening then the error is %s for %i",
    (positions, code, character) => {
      const result = openScene(
        presets,
        characters,
        { grid: ROOM, positions },
        createRngState(SEEDS),
      );

      expect(errorOf(result)).toStrictEqual({ code, character });
    },
  );

  it("given every suggested start taken when placing then the free passable cell of lowest index is used without drawing", () => {
    const drawer = createDrawer(createRngState(SEEDS), { tick: 0, mode: "NORMAL", forced: [] });

    expect(drawCell(drawer, ROOM_GRID, [10, 11], [10, 11, undefined], 2 as CharacterId)).toBe(12);
    expect(drawer.finish().records).toStrictEqual([]);
  });

  it("given no free passable cell when placing then it is a programming error", () => {
    const drawer = createDrawer(createRngState(SEEDS), { tick: 0, mode: "NORMAL", forced: [] });
    const taken = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

    expect(() => drawCell(drawer, ROOM_GRID, [], taken, 0 as CharacterId)).toThrow(RangeError);
  });

  it("given an invalid grid when opening then the grid error comes back", () => {
    const broken = { ...ROOM, exits: [] };

    expect(
      errorOf(openScene(presets, characters, { grid: broken }, createRngState(SEEDS))),
    ).toStrictEqual({
      code: "INVALID_GRID",
      grid: { code: "NO_EXIT" },
    });
  });

  it("given a hungover character when opening then only the needs with a range are drawn", () => {
    const scene = opened({ grid: ROOM, dayStates: ["hungover"] });
    const draws = scene.records.filter(
      (record) => record.purpose === "DAY_STATE_BODY" && record.target === 0,
    );
    const elder = characterOf(scene.characters, 0);

    expect(draws.map((record) => record.bound)).toStrictEqual([2001, 2001, 2001]);
    expect([elder.body.fatigue, elder.body.pain, elder.body.intoxication]).toStrictEqual([
      5000, 2000, 2000,
    ]);
  });

  it("given an opened scene when reading the characters then perceptions and threat start empty", () => {
    const character = characterOf(opened({ grid: ROOM }).characters, 1);

    expect([character.perceptions, character.threat]).toStrictEqual([[], 0]);
  });

  it("given a drawn start when opening then the cell is the suggested start the draw picked among the free ones", () => {
    const scene = opened({ grid: ROOM, positions: [{ x: 0, y: 1 }] });
    const starts = scene.records.filter((record) => record.purpose === "START_CELL");

    expect(starts.map((record) => [record.target, record.bound])).toStrictEqual([
      [1, 7],
      [2, 6],
    ]);
    expect(characterOf(scene.characters, 1).cell).toBe(11 + (starts[0]?.outcome ?? 0));
  });

  it("given some suggested starts taken when placing then the draw is among the free ones only", () => {
    const drawer = createDrawer(createRngState(SEEDS), {
      tick: 0,
      mode: "NORMAL",
      forced: [{ selector: { kind: "PURPOSE", purpose: "START_CELL" }, outcome: 1 }],
    });

    expect(drawCell(drawer, ROOM_GRID, [10, 11, 12], [10, undefined], 1 as CharacterId)).toBe(12);
    expect(drawer.finish().records.map((record) => record.bound)).toStrictEqual([2]);
  });

  it("given a grid whose first cell is free floor when no start is free then the first cell is used", () => {
    const row = valueOf(
      parseGridSpec({
        rows: [".........d"],
        exits: [{ x: 9, y: 0 }],
        roofed: "ALL",
        starts: [0, 1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, y: 0 })),
      }),
    );
    const drawer = createDrawer(createRngState(SEEDS), { tick: 0, mode: "NORMAL", forced: [] });

    expect(drawCell(drawer, row, [], [], 0 as CharacterId)).toBe(0);
  });

  it("given no free passable cell when placing then the error names the character", () => {
    const drawer = createDrawer(createRngState(SEEDS), { tick: 0, mode: "NORMAL", forced: [] });
    const taken = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

    expect(() => drawCell(drawer, ROOM_GRID, [], taken, 4 as CharacterId)).toThrow(
      new RangeError("no free passable cell for character 4"),
    );
  });
});
