import { describe, expect, it } from "vitest";

import { gridOf } from "../../test/support/space.ts";
import { CELL_RULES, CELL_TYPES, cellDistance, cellIndex, cellPos, isPassable } from "./grid.ts";

/** A 3 × 2 grid of floor. */
const SMALL = gridOf(["...", "..."]);

describe("cell types (simulation-model §3.1)", () => {
  it("given the cell table when listing the types then there are the seven of the specification", () => {
    expect(CELL_TYPES).toStrictEqual([
      "FLOOR",
      "ROUGH",
      "DOOR_OPEN",
      "DOOR_CLOSED",
      "WINDOW",
      "LOW_OBSTACLE",
      "WALL",
    ]);
  });

  it.each([
    ["FLOOR", ".", 1, false],
    ["ROUGH", ",", 2, false],
    ["DOOR_OPEN", "d", 1, false],
    ["DOOR_CLOSED", "D", 2, true],
    ["WINDOW", "=", 0, false],
    ["LOW_OBSTACLE", "o", 0, false],
    ["WALL", "#", 0, true],
  ] as const)(
    "given %s when reading its rule then symbol %s, %i ticks to enter and sight blocked %s",
    (type, symbol, enterTicks, blocksSight) => {
      expect(CELL_RULES[type]).toStrictEqual({ symbol, enterTicks, blocksSight });
    },
  );

  it.each([
    ["FLOOR", true],
    ["ROUGH", true],
    ["DOOR_OPEN", true],
    ["DOOR_CLOSED", true],
    ["WINDOW", false],
    ["LOW_OBSTACLE", false],
    ["WALL", false],
  ] as const)("given %s when checking if it can be crossed then it is %s", (type, passable) => {
    expect(isPassable(type)).toBe(passable);
  });
});

describe("cell indices (simulation-model §3.1)", () => {
  it("given a position when computing its index then it is y × W + x", () => {
    expect(cellIndex(SMALL, { x: 2, y: 1 })).toBe(5);
  });

  it("given an index when computing its position then it is the column and the row", () => {
    expect(cellPos(SMALL, 5)).toStrictEqual({ x: 2, y: 1 });
  });

  it("given the first cell when computing its position then it is the top-left corner", () => {
    expect(cellPos(SMALL, 0)).toStrictEqual({ x: 0, y: 0 });
  });

  it.each([
    [-1, 0],
    [0, -1],
    [3, 0],
    [0, 2],
    [0.5, 0],
    [0, 0.5],
  ])("given position (%d, %d) outside the grid when indexing then it throws", (x, y) => {
    expect(() => cellIndex(SMALL, { x, y })).toThrow(
      new RangeError(`cell (${x}, ${y}) is outside the 3 × 2 grid`),
    );
  });

  it.each([-1, 6, 1.5])("given index %d outside the grid when locating then it throws", (index) => {
    expect(() => cellPos(SMALL, index)).toThrow(
      new RangeError(`cell index ${index} is outside the 3 × 2 grid`),
    );
  });
});

describe("cellDistance (simulation-model §3.1)", () => {
  const room = gridOf(["......", "......", "......", "......"]);

  it("given two cells when measuring then the distance is Chebyshev's max(|dx|, |dy|)", () => {
    expect(
      cellDistance(room, cellIndex(room, { x: 1, y: 0 }), cellIndex(room, { x: 4, y: 2 })),
    ).toBe(3);
  });

  it("given a taller than wide gap when measuring then the distance is |dy|", () => {
    expect(
      cellDistance(room, cellIndex(room, { x: 5, y: 0 }), cellIndex(room, { x: 4, y: 3 })),
    ).toBe(3);
  });

  it("given the same cell when measuring then the distance is 0", () => {
    expect(cellDistance(room, 7, 7)).toBe(0);
  });

  it("given an index outside the grid when measuring then it throws", () => {
    expect(() => cellDistance(room, 0, 24)).toThrow(
      new RangeError("cell index 24 is outside the 6 × 4 grid"),
    );
  });
});
