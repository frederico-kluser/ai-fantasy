import { describe, expect, it } from "vitest";

import { createDrawer, type Drawer, type DrawerOptions } from "./drawer.ts";
import { createRngState } from "./state.ts";

const SEEDS = { castSeed: 1, sceneSeed: 42 };

function openDrawer(options: Partial<DrawerOptions>): Drawer {
  return createDrawer(createRngState(SEEDS), { tick: 0, mode: "NORMAL", forced: [], ...options });
}

/** A raw draw, a chance and a weighted draw; returns the rng state they leave. */
function drawEachKind(drawer: Drawer): unknown {
  drawer.draw("turn", 10, "PICK");
  drawer.drawChance("leave", 4999, "LEAVE");
  drawer.drawWeighted("choice", [1, 5, 2], "ACT_CHOICE");
  return drawer.finish().rng;
}

describe("MOST_LIKELY mode (simulation-model §15)", () => {
  it("given MOST_LIKELY mode when drawing weighted options then the heaviest option wins and ties go to the lowest index", () => {
    const drawer = openDrawer({ mode: "MOST_LIKELY" });

    // Naturally the choice stream would pick 2, 2 and 2 here.
    expect([
      drawer.drawWeighted("choice", [1, 5, 2], "ACT_CHOICE"),
      drawer.drawWeighted("choice", [3, 7, 7], "ACT_CHOICE"),
      drawer.drawWeighted("choice", [0, 0, 4], "ACT_CHOICE"),
    ]).toStrictEqual([1, 1, 2]);
  });

  it("given MOST_LIKELY mode when drawing chances of 4999 and 5000 then the first fails and the second succeeds", () => {
    const drawer = openDrawer({ mode: "MOST_LIKELY" });

    // Naturally both would fail here (u = 9867 and 8978).
    expect([
      drawer.drawChance("leave", 4999, "LEAVE"),
      drawer.drawChance("leave", 5000, "LEAVE"),
    ]).toStrictEqual([false, true]);
  });

  it("given MOST_LIKELY mode when drawing a raw value below 10 then it returns 4", () => {
    // Naturally the turn stream would give 1 here.
    expect(openDrawer({ mode: "MOST_LIKELY" }).draw("turn", 10, "PICK")).toBe(4);
  });

  it("given MOST_LIKELY mode when drawing then the record has the mode and the natural value", () => {
    const drawer = openDrawer({ mode: "MOST_LIKELY" });
    drawer.draw("turn", 10000, "PICK");

    expect(drawer.finish().records).toStrictEqual([
      {
        seq: 0,
        tick: 0,
        stream: "turn",
        kind: "RAW",
        purpose: "PICK",
        bound: 10000,
        value: 7621,
        outcome: 4999,
        mode: "MOST_LIKELY",
      },
    ]);
  });

  it("given MOST_LIKELY mode when drawing then the streams are consumed as in NORMAL mode", () => {
    expect(drawEachKind(openDrawer({ mode: "MOST_LIKELY" }))).toStrictEqual(
      drawEachKind(openDrawer({ mode: "NORMAL" })),
    );
  });

  it("given MOST_LIKELY mode and a forced draw when drawing then the forced outcome wins", () => {
    const drawer = openDrawer({
      mode: "MOST_LIKELY",
      forced: [{ selector: { kind: "SEQ", seq: 0 }, outcome: 9 }],
    });

    expect(drawer.draw("turn", 10, "PICK")).toBe(9);
    expect(drawer.finish().records).toMatchObject([
      { outcome: 9, value: 1, forced: true, mode: "MOST_LIKELY" },
    ]);
  });

  it("given MOST_LIKELY mode and an impossible forced outcome when drawing then the most likely outcome applies", () => {
    const drawer = openDrawer({
      mode: "MOST_LIKELY",
      forced: [{ selector: { kind: "SEQ", seq: 0 }, outcome: 10 }],
    });

    expect(drawer.draw("turn", 10, "PICK")).toBe(4);
    expect(drawer.finish().records).toStrictEqual([
      {
        seq: 0,
        tick: 0,
        stream: "turn",
        kind: "RAW",
        purpose: "PICK",
        bound: 10,
        value: 1,
        outcome: 4,
        mode: "MOST_LIKELY",
      },
    ]);
  });
});
