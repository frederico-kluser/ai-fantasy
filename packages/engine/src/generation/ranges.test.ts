import { describe, expect, it } from "vitest";

import type { CharacterId } from "../domain/ids.ts";
import { createDrawer } from "../rng/drawer.ts";
import { createRngState } from "../rng/state.ts";
import { around, drawInRange } from "./ranges.ts";

const LABEL = { stream: "setup", purpose: "TEST_RANGE", target: 3 as CharacterId } as const;

function aDrawer() {
  return createDrawer(createRngState({ castSeed: 1, sceneSeed: 2 }), {
    tick: 0,
    mode: "NORMAL",
    forced: [],
  });
}

describe("drawInRange (presets §1 rule 4)", () => {
  it("given a range of one value when drawing then it is the value and nothing is drawn", () => {
    const drawer = aDrawer();

    expect(drawInRange(drawer, { min: 5000, max: 5000 }, LABEL)).toBe(5000);
    expect(drawer.finish().records).toStrictEqual([]);
  });

  it("given a range when drawing then the value is min plus a draw bounded by the width", () => {
    const drawer = aDrawer();
    const value = drawInRange(drawer, { min: -2000, max: 2000 }, LABEL);
    const [record] = drawer.finish().records;

    expect([record?.bound, record?.stream, record?.purpose, record?.target]).toStrictEqual([
      4001,
      "setup",
      "TEST_RANGE",
      3,
    ]);
    expect(value).toBe(-2000 + (record?.outcome ?? 0));
  });

  it("given a range forced to its last value when drawing then the maximum comes out", () => {
    const drawer = createDrawer(createRngState({ castSeed: 1, sceneSeed: 2 }), {
      tick: 0,
      mode: "NORMAL",
      forced: [{ selector: { kind: "PURPOSE", purpose: "TEST_RANGE" }, outcome: 500 }],
    });

    expect(drawInRange(drawer, { min: 0, max: 500 }, LABEL)).toBe(500);
  });
});

describe("around", () => {
  it.each([
    [9500, 1000, 0, 10000, { min: 8500, max: 10000 }],
    [-9000, 1500, -10000, 10000, { min: -10000, max: -7500 }],
    [3000, 1000, 0, 10000, { min: 2000, max: 4000 }],
  ])(
    "given %i ± %i within %i..%i when making the range then it is %j",
    (value, spread, low, high, range) => {
      expect(around(value, spread, low, high)).toStrictEqual(range);
    },
  );
});
