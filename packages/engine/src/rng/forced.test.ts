import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { CharacterId } from "../domain/ids.ts";
import { createDrawer, type Drawer, type DrawerOptions, type ForcedDraw } from "./drawer.ts";
import { createRngState } from "./state.ts";

const SEEDS = { castSeed: 1, sceneSeed: 42 };
const NORMAL: DrawerOptions = { tick: 0, mode: "NORMAL", forced: [] };
/** Natural raw draws below 100 from `turn` with scene seed 42 (independent reference). */
const NATURAL_BELOW_100 = [21, 49, 4, 87, 79];

/** Test ids are known to be valid, so the brand is given directly. */
function characterId(value: number): CharacterId {
  return value as CharacterId;
}

function forcedDrawer(forced: readonly ForcedDraw[], sceneSeed = SEEDS.sceneSeed): Drawer {
  return createDrawer(createRngState({ castSeed: 1, sceneSeed }), { ...NORMAL, forced });
}

function fiveDraws(drawer: Drawer): number[] {
  return Array.from({ length: 5 }, () => drawer.draw("turn", 100, "PICK"));
}

describe("forced draws (simulation-model §15, invariant 8)", () => {
  it("given a forced draw selector when drawing then only that draw takes the forced outcome", () => {
    const drawer = forcedDrawer([{ selector: { kind: "SEQ", seq: 2 }, outcome: 99 }]);

    expect(fiveDraws(drawer)).toStrictEqual(NATURAL_BELOW_100.with(2, 99));
  });

  it("given a forced draw when drawing then the record keeps the natural value and is marked as forced", () => {
    const drawer = forcedDrawer([{ selector: { kind: "SEQ", seq: 0 }, outcome: 99 }]);
    drawer.draw("turn", 100, "PICK");

    expect(drawer.finish().records).toStrictEqual([
      {
        seq: 0,
        tick: 0,
        stream: "turn",
        kind: "RAW",
        purpose: "PICK",
        bound: 100,
        value: 21,
        outcome: 99,
        forced: true,
      },
    ]);
  });

  it("given a forced draw when drawing then the stream is consumed as in the natural draw", () => {
    const natural = forcedDrawer([]);
    const forced = forcedDrawer([{ selector: { kind: "SEQ", seq: 1 }, outcome: 0 }]);
    fiveDraws(natural);
    fiveDraws(forced);

    expect(forced.finish().rng).toStrictEqual(natural.finish().rng);
  });

  it("given a purpose selector without target when drawing then every draw with that purpose is forced", () => {
    const drawer = forcedDrawer([{ selector: { kind: "PURPOSE", purpose: "PICK" }, outcome: 7 }]);

    expect([
      drawer.draw("turn", 100, "PICK"),
      drawer.draw("turn", 100, "OTHER"),
      drawer.draw("turn", 100, "PICK", characterId(2)),
    ]).toStrictEqual([7, 49, 7]);
  });

  it("given a purpose selector with a target when drawing then only the draws for that target are forced", () => {
    const drawer = forcedDrawer([
      { selector: { kind: "PURPOSE", purpose: "PICK", target: characterId(2) }, outcome: 7 },
    ]);

    expect([
      drawer.draw("turn", 100, "PICK"),
      drawer.draw("turn", 100, "PICK", characterId(1)),
      drawer.draw("turn", 100, "PICK", characterId(2)),
    ]).toStrictEqual([21, 49, 7]);
  });

  it("given two matching selectors when drawing then the first one in the list wins", () => {
    const drawer = forcedDrawer([
      { selector: { kind: "PURPOSE", purpose: "PICK" }, outcome: 5 },
      { selector: { kind: "SEQ", seq: 0 }, outcome: 9 },
    ]);

    expect(drawer.draw("turn", 100, "PICK")).toBe(5);
  });

  it("given a forced chance and a forced weighted draw when drawing then they take the forced outcomes", () => {
    const drawer = forcedDrawer([
      { selector: { kind: "SEQ", seq: 0 }, outcome: 1 },
      { selector: { kind: "SEQ", seq: 1 }, outcome: 0 },
    ]);

    // Naturally: 7621 < 10 fails, and u = 9 over the weights 9 and 1 picks index 1.
    expect([
      drawer.drawChance("turn", 10, "SPEAK_UP"),
      drawer.drawWeighted("turn", [9, 1], "ACT_CHOICE"),
    ]).toStrictEqual([true, 0]);
  });

  it.each([
    ["a raw value at the bound", (drawer: Drawer) => drawer.draw("turn", 100, "PICK"), 100, 21],
    ["a success with p 0", (drawer: Drawer) => drawer.drawChance("turn", 0, "PICK"), 1, false],
    [
      "a failure with p 10000",
      (drawer: Drawer) => drawer.drawChance("turn", 10000, "PICK"),
      0,
      true,
    ],
    [
      "a chance outcome of 2",
      (drawer: Drawer) => drawer.drawChance("turn", 5000, "PICK"),
      2,
      false,
    ],
    [
      "an option of weight 0",
      (drawer: Drawer) => drawer.drawWeighted("turn", [0, 5], "PICK"),
      0,
      1,
    ],
    [
      "an index past the options",
      (drawer: Drawer) => drawer.drawWeighted("turn", [1, 1], "PICK"),
      2,
      1,
    ],
  ])(
    "given %s forced when drawing then the natural outcome stays and the record is not forced",
    (_, draw, outcome, natural) => {
      const drawer = forcedDrawer([{ selector: { kind: "SEQ", seq: 0 }, outcome }]);

      expect(draw(drawer)).toBe(natural);
      expect(drawer.finish().records.filter((record) => "forced" in record)).toStrictEqual([]);
    },
  );

  it("given any seed and forced draw when drawing then only that outcome changes and the rng state is the same", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4294967295 }),
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 99 }),
        (sceneSeed, seq, outcome) => {
          const natural = forcedDrawer([], sceneSeed);
          const forced = forcedDrawer([{ selector: { kind: "SEQ", seq }, outcome }], sceneSeed);

          expect(fiveDraws(forced)).toStrictEqual(fiveDraws(natural).with(seq, outcome));
          expect(forced.finish().rng).toStrictEqual(natural.finish().rng);
        },
      ),
    );
  });
});
