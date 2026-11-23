import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { costOfPath, isLegalPath, referenceCost } from "../../test/support/paths.ts";
import { arbitraryTwoCells, cellAt, gridOf } from "../../test/support/space.ts";
import { err, ok } from "../domain/result.ts";
import { findPath } from "./path.ts";

/** A 5 × 3 room of floor. */
const ROOM = gridOf([".....", ".....", "....."]);

describe("findPath: cheapest path (simulation-model §3.1)", () => {
  it("given an open row when finding a path then it goes straight to the destination", () => {
    expect(findPath(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 4, 0), [])).toStrictEqual(
      ok([1, 2, 3, 4]),
    );
  });

  it("given a diagonal destination when finding a path then it steps diagonally", () => {
    expect(findPath(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 2, 2), [])).toStrictEqual(ok([6, 12]));
  });

  it("given the origin as the destination when finding a path then the path is empty", () => {
    expect(findPath(ROOM, 7, 7, [])).toStrictEqual(ok([]));
  });

  it("given two first steps of the same cost when finding a path then the lower index comes first", () => {
    expect(findPath(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 2, 1), [])).toStrictEqual(ok([1, 7]));
  });

  it("given routes of the same cost when finding a path then the lexicographically smallest sequence wins", () => {
    expect(findPath(ROOM, cellAt(ROOM, 0, 1), cellAt(ROOM, 4, 1), [])).toStrictEqual(
      ok([1, 2, 3, 9]),
    );
  });

  it("given rough ground on the straight route when a free detour costs less then the path goes around", () => {
    const grid = gridOf([".,.", "..."]);

    expect(findPath(grid, 0, 2, [])).toStrictEqual(ok([4, 2]));
  });

  it("given a closed door on the straight route when a free detour costs less then the path goes around", () => {
    const grid = gridOf([".D.", "..."]);

    expect(findPath(grid, 0, 2, [])).toStrictEqual(ok([4, 2]));
  });

  it("given a closed door as the only way when finding a path then the path crosses it", () => {
    const grid = gridOf(["#.#", "#D#", "#.#"]);

    expect(findPath(grid, 1, 7, [])).toStrictEqual(ok([4, 7]));
  });

  it("given rough ground as the only way when finding a path then the path crosses it", () => {
    expect(findPath(gridOf([".,."]), 0, 2, [])).toStrictEqual(ok([1, 2]));
  });
});

describe("findPath: corners (simulation-model §3.1)", () => {
  it.each([
    ["a wall", ".#"],
    ["a low obstacle", ".o"],
    ["a window", ".="],
  ])(
    "given %s beside a diagonal step when finding a path then the path does not cut the corner",
    (_, top) => {
      const grid = gridOf([top, ".."]);

      expect(findPath(grid, 0, 3, [])).toStrictEqual(ok([2, 3]));
    },
  );

  it("given people on both cells beside a diagonal step when finding a path then the diagonal is allowed", () => {
    const grid = gridOf(["..", ".."]);

    expect(findPath(grid, 0, 3, [1, 2])).toStrictEqual(ok([3]));
  });
});

describe("findPath: occupied and closed cells (simulation-model §3.1)", () => {
  it("given someone on the only route when finding a path then there is no path", () => {
    expect(findPath(gridOf(["..."]), 0, 2, [1])).toStrictEqual(err("NO_PATH"));
  });

  it("given someone on the destination when finding a path then there is no path", () => {
    expect(findPath(gridOf(["..."]), 0, 2, [2])).toStrictEqual(err("NO_PATH"));
  });

  it("given someone on a cell off the route when finding a path then the route is the same", () => {
    expect(findPath(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 4, 0), [12])).toStrictEqual(
      ok([1, 2, 3, 4]),
    );
  });

  it("given someone in the way in a room when finding a path then the path goes around", () => {
    expect(findPath(ROOM, cellAt(ROOM, 0, 0), cellAt(ROOM, 2, 0), [1])).toStrictEqual(ok([6, 2]));
  });

  it("given the mover's own cell among the occupied when finding a path then it is ignored", () => {
    expect(findPath(gridOf(["..."]), 0, 2, [0])).toStrictEqual(ok([1, 2]));
  });

  it("given a destination behind a full wall when finding a path then there is no path", () => {
    expect(findPath(gridOf([".#."]), 0, 2, [])).toStrictEqual(err("NO_PATH"));
  });

  it("given a wall as the destination when finding a path then there is no path", () => {
    expect(findPath(gridOf(["..#"]), 0, 2, [])).toStrictEqual(err("NO_PATH"));
  });

  it("given an origin that cannot be stood on when finding a path then it throws a RangeError", () => {
    expect(() => findPath(gridOf(["#.."]), 0, 2, [])).toThrow(
      new RangeError("nobody can stand on cell 0, a WALL"),
    );
  });

  it("given an occupied cell outside the grid when finding a path then it throws a RangeError", () => {
    expect(() => findPath(gridOf(["..."]), 0, 2, [3])).toThrow(
      new RangeError("cell index 3 is outside the 3 × 1 grid"),
    );
  });

  it("given a destination outside the grid when finding a path then it throws a RangeError", () => {
    expect(() => findPath(gridOf(["..."]), 0, -1, [])).toThrow(
      new RangeError("cell index -1 is outside the 3 × 1 grid"),
    );
  });
});

describe("findPath: properties (simulation-model §3.1)", () => {
  it("given any grid and two cells when finding a path then its cost is the cheapest possible", () => {
    fc.assert(
      fc.property(arbitraryTwoCells(7), ({ grid, from, to }) => {
        fc.pre(grid.cells[from] === "FLOOR");

        expect(costOfPath(grid, findPath(grid, from, to, []))).toBe(
          referenceCost(grid, from, to, []),
        );
      }),
    );
  });

  it("given any grid, two cells and people around when finding a path then every step is legal", () => {
    fc.assert(
      fc.property(
        arbitraryTwoCells(7),
        fc.array(fc.nat(), { maxLength: 6 }),
        ({ grid, from, to }, people) => {
          fc.pre(grid.cells[from] === "FLOOR");
          const occupied = people.map((cell) => cell % grid.cells.length);

          expect(isLegalPath(grid, from, findPath(grid, from, to, occupied), occupied)).toBe(true);
        },
      ),
    );
  });

  it("given any grid, two cells and people around when finding a path then its cost is the cheapest possible", () => {
    fc.assert(
      fc.property(
        arbitraryTwoCells(7),
        fc.array(fc.nat(), { maxLength: 6 }),
        ({ grid, from, to }, people) => {
          fc.pre(grid.cells[from] === "FLOOR");
          const occupied = people.map((cell) => cell % grid.cells.length);

          expect(costOfPath(grid, findPath(grid, from, to, occupied))).toBe(
            referenceCost(grid, from, to, occupied),
          );
        },
      ),
    );
  });
});
