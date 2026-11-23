import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cellAt, gridOf } from "../../test/support/space.ts";
import { canSee, cellsBetween, hasLineOfSight } from "./sight.ts";

/** A 5 × 3 room of floor. */
const ROOM = gridOf([".....", ".....", "....."]);

describe("cellsBetween: the supercover (simulation-model §3.1)", () => {
  it("given a horizontal line when listing the cells between then they come in order, endpoints excluded", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 0, 1), cellAt(ROOM, 4, 1))).toStrictEqual([6, 7, 8]);
  });

  it("given a vertical line when listing the cells between then they come in order", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 3, 0), cellAt(ROOM, 3, 2))).toStrictEqual([8]);
  });

  it("given two neighbours on a row when listing the cells between then there is none", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 1, 1), cellAt(ROOM, 2, 1))).toStrictEqual([]);
  });

  it("given the same cell twice when listing the cells between then there is none", () => {
    expect(cellsBetween(ROOM, 7, 7)).toStrictEqual([]);
  });

  it("given diagonal neighbours when listing the cells between then both cells sharing the corner are in", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 1, 1))).toStrictEqual([1, 5]);
  });

  it("given a long diagonal when listing the cells between then each corner adds its two cells", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 2, 2))).toStrictEqual([
      1, 5, 6, 7, 11,
    ]);
  });

  it("given an anti-diagonal when listing the cells between then the corners follow the direction", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 2, 0), cellAt(ROOM, 0, 2))).toStrictEqual([
      1, 7, 6, 5, 11,
    ]);
  });

  it("given a slope of one half when listing the cells between then the line steps in x and in y", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 4, 2))).toStrictEqual([
      1, 6, 7, 8, 13,
    ]);
  });

  it("given a slope of one half drawn backwards when listing the cells between then the cells mirror", () => {
    expect(cellsBetween(ROOM, cellAt(ROOM, 4, 2), cellAt(ROOM, 0, 0))).toStrictEqual([
      13, 8, 7, 6, 1,
    ]);
  });

  it("given any two cells when listing the cells between both ways then the sets are the same", () => {
    const sorted = (cells: readonly number[]): number[] => [...cells].sort((a, b) => a - b);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 48 }),
        fc.integer({ min: 1, max: 48 }),
        fc.nat(),
        fc.nat(),
        (width, height, a, b) => {
          const grid = gridOf(Array.from({ length: height }, () => ".".repeat(width)));
          const from = a % (width * height);
          const to = b % (width * height);

          expect(sorted(cellsBetween(grid, from, to))).toStrictEqual(
            sorted(cellsBetween(grid, to, from)),
          );
        },
      ),
    );
  });
});

describe("hasLineOfSight (simulation-model §3.1)", () => {
  it("given a wall between two cells when checking sight then it is blocked", () => {
    const grid = gridOf([".#."]);

    expect(hasLineOfSight(grid, 0, 2)).toBe(false);
  });

  it("given a low obstacle between two cells when checking sight then it is not blocked", () => {
    const grid = gridOf([".o."]);

    expect(hasLineOfSight(grid, 0, 2)).toBe(true);
  });

  it.each([
    ["a closed door", ".D.", false],
    ["an open door", ".d.", true],
    ["a window", ".=.", true],
    ["rough ground", ".,.", true],
    ["floor", "...", true],
  ])("given %s between two cells when checking sight then seeing is %s", (_, row, sees) => {
    expect(hasLineOfSight(gridOf([row]), 0, 2)).toBe(sees);
  });

  it("given a wall on one cell of a corner the line passes when checking sight then it is blocked", () => {
    const grid = gridOf([".#", ".."]);

    expect(hasLineOfSight(grid, cellAt(grid, 0, 0), cellAt(grid, 1, 1))).toBe(false);
  });

  it("given a window on one cell of a corner the line passes when checking sight then it is not blocked", () => {
    const grid = gridOf([".=", ".."]);

    expect(hasLineOfSight(grid, cellAt(grid, 0, 0), cellAt(grid, 1, 1))).toBe(true);
  });

  it("given someone standing on a closed door when checking sight both ways then the endpoints never block", () => {
    const grid = gridOf(["D.D"]);

    expect([hasLineOfSight(grid, 0, 2), hasLineOfSight(grid, 2, 0)]).toStrictEqual([true, true]);
  });

  it("given a wall beside the line but not on it when checking sight then it is not blocked", () => {
    const grid = gridOf(["......", ".....#", "......"]);

    expect(hasLineOfSight(grid, cellAt(grid, 0, 1), cellAt(grid, 5, 2))).toBe(true);
  });
});

describe("canSee (simulation-model §3.2)", () => {
  const corridor = gridOf(["......"]);

  it("given a target at the edge of the range when checking then it is seen", () => {
    expect(canSee(corridor, 0, 5, 5)).toBe(true);
  });

  it("given a target one cell beyond the range when checking then it is not seen", () => {
    expect(canSee(corridor, 0, 5, 4)).toBe(false);
  });

  it("given a target in range behind a wall when checking then it is not seen", () => {
    expect(canSee(gridOf(["..#..."]), 0, 5, 20)).toBe(false);
  });
});
