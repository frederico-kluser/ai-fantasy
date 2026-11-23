import { describe, expect, it } from "vitest";

import { aDrawer, forcing } from "../../test/support/acts.ts";
import { defaultSignals } from "../../test/support/signals.ts";
import { idOf } from "../../test/support/space.ts";
import type { SignalCauseId } from "../presets/signals.ts";
import { emissionChance, emitSignals } from "./emission.ts";

const SIGNALS = defaultSignals();

/** Every cause at 0, with the overrides given. */
function causes(overrides: Partial<Record<SignalCauseId, number>>): Record<SignalCauseId, number> {
  return {
    fear: 0,
    sadness: 0,
    anger: 0,
    disgust: 0,
    shame: 0,
    guilt: 0,
    jealousy: 0,
    joy: 0,
    boredom: 0,
    attraction: 0,
    lying: 0,
    cold: 0,
    fatigue: 0,
    pain: 0,
    intoxication: 0,
    ...overrides,
  };
}

describe("emissionChance (simulation-model §7, emission)", () => {
  it("given fear at 9000 and selfControl 10000 when emitting then the tremor chance is half of the base", () => {
    expect([emissionChance(9000, 0), emissionChance(9000, 10000)]).toStrictEqual([8000, 4000]);
  });

  it("given selfControl -10000 when emitting then the chance is 50% more: 6000 becomes 9000", () => {
    expect(emissionChance(8000, -10000)).toBe(9000);
  });

  it("given selfControl -10000 and an intensity at the top when emitting then the chance stops at 10000", () => {
    expect(emissionChance(10000, -10000)).toBe(10000);
  });

  it("given an intensity of exactly 5000 when emitting then the chance is 0", () => {
    expect(emissionChance(5000, 0)).toBe(0);
  });

  it("given an intensity below 5000 when emitting then the chance is 0", () => {
    expect(emissionChance(3000, -10000)).toBe(0);
  });

  it("given an intensity of 5001 when emitting then the chance is 2", () => {
    expect(emissionChance(5001, 0)).toBe(2);
  });
});

describe("emitSignals (simulation-model §7, emission on the signal stream)", () => {
  it("given only fear at 9000 forced to emit when emitting then the five signals of fear come out, in the order of the table", () => {
    const drawer = aDrawer([forcing("SIGNAL_EMIT", 1, 4)]);

    const emitted = emitSignals(drawer, SIGNALS, {
      emitter: idOf(4),
      intensities: causes({ fear: 9000 }),
      selfControl: 0,
    });

    expect(emitted.map((entry) => entry.signal)).toStrictEqual([
      "tremor",
      "shakyVoice",
      "avertedGaze",
      "stepBack",
      "nervousLaugh",
    ]);
  });

  it("given fear forced to emit when emitting then each signal carries the emitter, its channel and fear as the true cause", () => {
    const drawer = aDrawer([forcing("SIGNAL_EMIT", 1, 4)]);

    const [first, second] = emitSignals(drawer, SIGNALS, {
      emitter: idOf(4),
      intensities: causes({ fear: 9000 }),
      selfControl: 0,
    });

    expect([first, second]).toStrictEqual([
      { emitter: 4, signal: "tremor", channel: "VISUAL", cause: "fear" },
      { emitter: 4, signal: "shakyVoice", channel: "VOCAL", cause: "fear" },
    ]);
  });

  it("given every emission forced to fail when emitting then nothing comes out", () => {
    const drawer = aDrawer([forcing("SIGNAL_EMIT", 0, 4)]);

    expect(
      emitSignals(drawer, SIGNALS, {
        emitter: idOf(4),
        intensities: causes({ fear: 9000 }),
        selfControl: 0,
      }),
    ).toStrictEqual([]);
  });

  it("given shame 6000 and anger 9000 both emitting a blush when emitting then the blush comes out once with anger as the true cause", () => {
    const drawer = aDrawer([forcing("SIGNAL_EMIT", 1, 4)]);

    const emitted = emitSignals(drawer, SIGNALS, {
      emitter: idOf(4),
      intensities: causes({ shame: 6000, anger: 9000 }),
      selfControl: 0,
    });

    expect(emitted.filter((entry) => entry.signal === "blush")).toStrictEqual([
      { emitter: 4, signal: "blush", channel: "VISUAL", cause: "anger" },
    ]);
  });

  it("given shame and anger tied at 8000 both emitting a blush when emitting then shame, first in the list of the blush, is the true cause", () => {
    const drawer = aDrawer([forcing("SIGNAL_EMIT", 1, 4)]);

    const emitted = emitSignals(drawer, SIGNALS, {
      emitter: idOf(4),
      intensities: causes({ anger: 8000, shame: 8000 }),
      selfControl: 0,
    });

    expect(emitted.find((entry) => entry.signal === "blush")?.cause).toBe("shame");
  });

  it("given a blush where only the weaker cause succeeds when emitting then that cause is the true one", () => {
    const drawer = aDrawer([
      { selector: { kind: "SEQ", seq: 0 }, outcome: 1 },
      { selector: { kind: "SEQ", seq: 1 }, outcome: 0 },
    ]);
    const blushOnly = SIGNALS.filter((signal) => signal.id === "blush");

    const emitted = emitSignals(drawer, blushOnly, {
      emitter: idOf(4),
      intensities: causes({ shame: 6000, anger: 9000 }),
      selfControl: 0,
    });

    expect(emitted).toStrictEqual([
      { emitter: 4, signal: "blush", channel: "VISUAL", cause: "shame" },
    ]);
  });

  it("given causes below 5000 when emitting then nothing is drawn", () => {
    const drawer = aDrawer();

    emitSignals(drawer, SIGNALS, {
      emitter: idOf(4),
      intensities: causes({ fear: 4999, joy: 1000 }),
      selfControl: 0,
    });

    expect(drawer.finish().records).toStrictEqual([]);
  });

  it("given fear and cold at 7000 when emitting then one draw per pair of cause and signal, in the order of the signal table and of each list", () => {
    const drawer = aDrawer();

    emitSignals(drawer, SIGNALS, {
      emitter: idOf(4),
      intensities: causes({ fear: 7000, cold: 7000 }),
      selfControl: 0,
    });

    expect(drawer.finish().records).toHaveLength(6);
  });

  it("given fear at 9000 and selfControl 10000 when emitting then each draw is a SIGNAL_EMIT chance of 4000 on the signal stream about the emitter", () => {
    const drawer = aDrawer();

    emitSignals(drawer, SIGNALS.slice(0, 1), {
      emitter: idOf(4),
      intensities: causes({ fear: 9000 }),
      selfControl: 10000,
    });

    expect(drawer.finish().records[0]).toMatchObject({
      stream: "signal",
      kind: "CHANCE",
      purpose: "SIGNAL_EMIT",
      target: 4,
      p: 4000,
    });
  });
});
