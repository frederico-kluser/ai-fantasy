import { describe, expect, it } from "vitest";

import type { CharacterId } from "../domain/ids.ts";
import { createDrawer, type Drawer, type DrawerOptions } from "./drawer.ts";
import { createRngState, STREAMS } from "./state.ts";
import { MAX_DRAW_BOUND } from "./uniform.ts";

const SEEDS = { castSeed: 1, sceneSeed: 42 };
const NORMAL: DrawerOptions = { tick: 0, mode: "NORMAL", forced: [] };

/** Test ids are known to be valid, so the brand is given directly. */
function characterId(value: number): CharacterId {
  return value as CharacterId;
}

function openDrawer(options: Partial<DrawerOptions> = {}): Drawer {
  return createDrawer(createRngState(SEEDS), { ...NORMAL, ...options });
}

/** Two raw draws, a chance and a weighted draw, as a step would do them. */
function drawMixed(drawer: Drawer): unknown[] {
  return [
    drawer.draw("turn", 100, "TURN_ORDER"),
    drawer.drawChance("leave", 5000, "LEAVE"),
    drawer.drawWeighted("choice", [1, 5, 2], "ACT_CHOICE"),
    drawer.draw("turn", 7, "TURN_ORDER"),
  ];
}

describe("drawer: draws and records (simulation-model §15)", () => {
  it("given scene seed 42 when drawing ten values below 10000 from turn then they match the reference", () => {
    const drawer = openDrawer();

    expect(
      Array.from({ length: 10 }, () => drawer.draw("turn", 10000, "TURN_ORDER")),
    ).toStrictEqual([7621, 1749, 8104, 4787, 8479, 1178, 6281, 1142, 911, 1265]);
  });

  it("given a drawer when drawing then each record has sequence, tick, stream, kind, purpose, bound, value and outcome", () => {
    const drawer = openDrawer({ tick: 7 });
    drawer.draw("turn", 10000, "TURN_ORDER");

    expect(drawer.finish().records).toStrictEqual([
      {
        seq: 0,
        tick: 7,
        stream: "turn",
        kind: "RAW",
        purpose: "TURN_ORDER",
        bound: 10000,
        value: 7621,
        outcome: 7621,
      },
    ]);
  });

  it("given a target when drawing then the record has it", () => {
    const drawer = openDrawer();
    drawer.draw("turn", 10000, "TURN_ORDER", characterId(3));

    expect(drawer.finish().records).toMatchObject([{ target: 3 }]);
  });

  it("given chance draws when drawing then p, bound 10000 and outcome 1 or 0 are recorded", () => {
    const drawer = openDrawer();
    const results = [
      drawer.drawChance("turn", 5000, "SPEAK_UP"),
      drawer.drawChance("turn", 5000, "SPEAK_UP"),
    ];

    expect(results).toStrictEqual([false, true]);
    expect(drawer.finish().records).toStrictEqual([
      {
        seq: 0,
        tick: 0,
        stream: "turn",
        kind: "CHANCE",
        purpose: "SPEAK_UP",
        bound: 10000,
        value: 7621,
        p: 5000,
        outcome: 0,
      },
      {
        seq: 1,
        tick: 0,
        stream: "turn",
        kind: "CHANCE",
        purpose: "SPEAK_UP",
        bound: 10000,
        value: 1749,
        p: 5000,
        outcome: 1,
      },
    ]);
  });

  it("given a weighted draw when drawing then the record has the total as bound and the index as outcome", () => {
    const drawer = openDrawer();

    expect(drawer.drawWeighted("turn", [1, 2, 3, 4], "ACT_CHOICE")).toBe(1);
    expect(drawer.finish().records).toStrictEqual([
      {
        seq: 0,
        tick: 0,
        stream: "turn",
        kind: "WEIGHTED",
        purpose: "ACT_CHOICE",
        bound: 10,
        value: 1,
        outcome: 1,
      },
    ]);
  });

  it("given the same seed when drawing from two streams then the sequences differ", () => {
    const drawer = createDrawer(createRngState({ castSeed: 7, sceneSeed: 7 }), NORMAL);
    const sequences = STREAMS.map((stream) =>
      Array.from({ length: 10 }, () => drawer.draw(stream, MAX_DRAW_BOUND, "SAMPLE")).join(),
    );

    expect(new Set(sequences).size).toBe(STREAMS.length);
  });

  it("given two drawers in a row when drawing then sequence numbers and streams continue", () => {
    const single = openDrawer();
    const together = Array.from({ length: 3 }, () => single.draw("turn", 100, "TURN_ORDER"));
    const first = openDrawer();
    const firstTwo = [first.draw("turn", 100, "TURN_ORDER"), first.draw("turn", 100, "TURN_ORDER")];
    const second = createDrawer(first.finish().rng, { ...NORMAL, tick: 1 });
    const third = second.draw("turn", 100, "TURN_ORDER");

    expect([...firstTwo, third]).toStrictEqual(together);
    expect(second.finish().records).toMatchObject([{ seq: 2, tick: 1 }]);
  });

  it("given the same state and calls when drawing twice then records and state are identical", () => {
    const first = openDrawer({ tick: 3 });
    const second = openDrawer({ tick: 3 });

    expect(drawMixed(first)).toStrictEqual(drawMixed(second));
    expect(first.finish()).toStrictEqual(second.finish());
  });

  it("given a drawer when finishing then only the used streams moved and the sequence advanced", () => {
    const rng = createRngState(SEEDS);
    const drawer = createDrawer(rng, NORMAL);
    drawMixed(drawer);
    const next = drawer.finish().rng;

    expect(next.nextSeq).toBe(4);
    expect(
      STREAMS.filter((name) => next.streams[name].join() !== rng.streams[name].join()),
    ).toStrictEqual(["turn", "choice", "leave"]);
  });

  it("given a drawer when finishing then the input rng state is unchanged", () => {
    const rng = createRngState(SEEDS);
    const before = structuredClone(rng);
    const drawer = createDrawer(rng, NORMAL);
    drawMixed(drawer);
    drawer.finish();

    expect(rng).toStrictEqual(before);
  });
});

describe("drawer: invalid use (development-rules §4)", () => {
  it.each([
    "turn_order",
    "TURN-ORDER",
    "_TURN",
    "TURN_",
    "TURN__ORDER",
    "1TURN",
    "",
    "TURN ORDER",
    "AÇÃO",
  ])("given the purpose %j when drawing then a RangeError is thrown", (purpose) => {
    expect(() => openDrawer().draw("turn", 10, purpose)).toThrow(
      new RangeError(`a draw purpose must be SCREAMING_SNAKE_CASE, got ${JSON.stringify(purpose)}`),
    );
  });

  it.each(["A", "TURN_ORDER", "LEAVE_2", "A1_B2_C3"])(
    "given the purpose %j when drawing then the draw is recorded",
    (purpose) => {
      const drawer = openDrawer();
      drawer.draw("turn", 10, purpose);

      expect(drawer.finish().records).toMatchObject([{ purpose }]);
    },
  );

  it.each([-1, 1.5, Number.NaN])(
    "given tick %d when creating a drawer then a RangeError is thrown",
    (tick) => {
      expect(() => openDrawer({ tick })).toThrow(
        new RangeError(`a tick must be a safe integer ≥ 0, got ${String(tick)}`),
      );
    },
  );

  it("given invalid draws when drawing then nothing is consumed", () => {
    const drawer = openDrawer();

    expect(() => drawer.draw("turn", 0, "TURN_ORDER")).toThrow(RangeError);
    expect(() => drawer.drawChance("turn", 10001, "SPEAK_UP")).toThrow(RangeError);
    expect(() => drawer.drawWeighted("turn", [], "ACT_CHOICE")).toThrow(RangeError);
    expect(() => drawer.draw("turn", 10, "bad purpose")).toThrow(RangeError);
    drawer.draw("turn", 10000, "TURN_ORDER");

    expect(drawer.finish().records).toMatchObject([{ seq: 0, value: 7621 }]);
  });

  it("given a finished drawer when drawing or finishing again then it throws", () => {
    const drawer = openDrawer();
    drawer.finish();
    const message = "this drawer is finished; draw again from the rng state it returned";

    expect(() => drawer.draw("turn", 10, "TURN_ORDER")).toThrow(new Error(message));
    expect(() => drawer.drawChance("turn", 10, "SPEAK_UP")).toThrow(new Error(message));
    expect(() => drawer.drawWeighted("turn", [1], "ACT_CHOICE")).toThrow(new Error(message));
    expect(() => drawer.finish()).toThrow(new Error(message));
  });
});
