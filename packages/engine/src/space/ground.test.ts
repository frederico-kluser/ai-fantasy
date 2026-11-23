import { describe, expect, it } from "vitest";

import { gridOf } from "../../test/support/space.ts";
import { costField, groundOf, NONE, UNREACHED } from "./ground.ts";

/** The field as a plain array, to compare with toStrictEqual. */
function costs(field: Int32Array): number[] {
  return Array.from(field);
}

describe("costField: costs from and to a cell (simulation-model §3.1)", () => {
  const corridor = gridOf([".,.."]);
  const ground = groundOf(corridor, [], 0);

  it("given rough ground when measuring FROM a cell then each cost counts the ticks to enter the cells", () => {
    expect(costs(costField(ground, 0, "FROM"))).toStrictEqual([0, 2, 3, 4]);
  });

  it("given rough ground when measuring TO a cell then each cost counts the ticks to enter the cells after it", () => {
    expect(costs(costField(ground, 0, "TO"))).toStrictEqual([0, 1, 3, 4]);
  });

  it("given a cell first reached past rough ground when a cheaper step reaches it then its cost improves", () => {
    const grid = gridOf(["....", ".,.."]);

    expect(costs(costField(groundOf(grid, [], 0), 0, "TO"))).toStrictEqual([
      0, 1, 2, 3, 1, 1, 2, 3,
    ]);
  });

  it("given a stop cell when measuring then the search ends once its cost is final", () => {
    const grid = gridOf(["....."]);

    expect(costs(costField(groundOf(grid, [], 0), 0, "TO", 2))).toStrictEqual([
      0,
      1,
      2,
      UNREACHED,
      UNREACHED,
    ]);
  });

  it("given a wall in the way when measuring then the cells behind it are unreached", () => {
    const grid = gridOf([".#."]);

    expect(costs(costField(groundOf(grid, [], 0), 0, "FROM"))).toStrictEqual([
      0,
      UNREACHED,
      UNREACHED,
    ]);
  });

  it("given a source taken by someone when measuring then every cell is unreached", () => {
    const grid = gridOf(["..."]);

    expect(costs(costField(groundOf(grid, [0], 2), 0, "TO"))).toStrictEqual([
      UNREACHED,
      UNREACHED,
      UNREACHED,
    ]);
  });

  it("given no cell when reading the markers then NONE and UNREACHED are -1", () => {
    expect([NONE, UNREACHED]).toStrictEqual([-1, -1]);
  });
});
