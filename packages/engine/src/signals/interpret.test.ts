import { describe, expect, it } from "vitest";

import { aBond } from "../../test/support/character.ts";
import { defaultSignals } from "../../test/support/signals.ts";
import type { ReaderView } from "../acts/tone.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import type { SignalId } from "../presets/signals.ts";
import { interpretationWeights, type InterpretationContext } from "./interpret.ts";
import type { SignalRule } from "./rules.ts";

const SIGNALS = defaultSignals();

function signalOf(id: SignalId): SignalRule {
  const found = SIGNALS.find((signal) => signal.id === id);
  expect(found).toBeDefined();
  return found as SignalRule;
}

/** A reader with perceptiveness 0, trustInOthers 0 and a stranger's bond, with the overrides given. */
function aReader(
  perceptiveness = 0,
  trustInOthers = 0,
  axes: Partial<Record<BondAxisId, number>> = {},
): ReaderView {
  return {
    perceptiveness: toBp(perceptiveness),
    trustInOthers: toBipolarBp(trustInOthers),
    bond: aBond(2, axes).axes,
  };
}

const MILD: InterpretationContext = { thermalTarget: toBipolarBp(0), phase: "MORNING" };

describe("interpretationWeights (simulation-model §7, interpreting)", () => {
  it("given cold weather and an observer with perceptiveness 0 when interpreting a tremor then cold weighs 20000 and fear 10000", () => {
    const context = { thermalTarget: toBipolarBp(-4000), phase: "MORNING" } as const;

    expect(interpretationWeights(signalOf("tremor"), "fear", aReader(), context)).toStrictEqual([
      10000, 20000,
    ]);
  });

  it("given a blush caused by shame and an observer with trustInOthers -10000 and perceptiveness 0 when interpreting then shame and attraction weigh 10000 and anger 15000", () => {
    expect(
      interpretationWeights(signalOf("blush"), "shame", aReader(0, -10000), MILD),
    ).toStrictEqual([10000, 10000, 15000]);
  });

  it("given an observer with perceptiveness 6000 when interpreting then the true cause gains 6000", () => {
    expect(interpretationWeights(signalOf("tremor"), "cold", aReader(6000), MILD)).toStrictEqual([
      10000, 16000,
    ]);
  });

  it("given an emitter whose thermal target is -2000 when interpreting a tremor then cold weighs double", () => {
    const context = { thermalTarget: toBipolarBp(-2000), phase: "MORNING" } as const;

    expect(interpretationWeights(signalOf("tremor"), "fear", aReader(), context)).toStrictEqual([
      10000, 20000,
    ]);
  });

  it("given an emitter whose thermal target is -1999 when interpreting a tremor then cold is not doubled", () => {
    const context = { thermalTarget: toBipolarBp(-1999), phase: "MORNING" } as const;

    expect(interpretationWeights(signalOf("tremor"), "fear", aReader(), context)).toStrictEqual([
      10000, 10000,
    ]);
  });

  it.each([
    ["DAWN", 20000],
    ["LATE_NIGHT", 20000],
    ["MORNING", 10000],
    ["AFTERNOON", 10000],
    ["EVENING", 10000],
  ] as const)(
    "given the phase %s when interpreting a yawn then fatigue weighs %i",
    (phase, expected) => {
      const context = { thermalTarget: toBipolarBp(0), phase };

      expect(interpretationWeights(signalOf("yawn"), "boredom", aReader(), context)).toStrictEqual([
        expected,
        10000,
      ]);
    },
  );

  it("given a true cold cause read by a perceptive observer in the cold when interpreting then the perceptiveness is added before doubling", () => {
    const context = { thermalTarget: toBipolarBp(-3000), phase: "MORNING" } as const;

    expect(interpretationWeights(signalOf("tremor"), "cold", aReader(2000), context)).toStrictEqual(
      [10000, 24000],
    );
  });

  it("given an observer with trustInOthers 10000 when interpreting a fixed stare then the threatening causes weigh half", () => {
    expect(
      interpretationWeights(signalOf("fixedStare"), "attraction", aReader(0, 10000), MILD),
    ).toStrictEqual([5000, 5000, 10000]);
  });

  it("given an observer with resentment 5000 toward the emitter when interpreting a fixed stare then the threatening causes weigh 1.5 times", () => {
    expect(
      interpretationWeights(
        signalOf("fixedStare"),
        "attraction",
        aReader(0, 0, { resentment: 5000 }),
        MILD,
      ),
    ).toStrictEqual([15000, 15000, 10000]);
  });

  it("given an observer with fearOf 5000 toward the emitter when interpreting averted gaze then lying weighs 1.5 times", () => {
    expect(
      interpretationWeights(
        signalOf("avertedGaze"),
        "shame",
        aReader(0, 0, { fearOf: 5000 }),
        MILD,
      ),
    ).toStrictEqual([10000, 10000, 10000, 15000]);
  });

  it("given an observer with resentment and fearOf 4999 when interpreting a fixed stare then nothing is wary", () => {
    expect(
      interpretationWeights(
        signalOf("fixedStare"),
        "attraction",
        aReader(0, 0, { resentment: 4999, fearOf: 4999 }),
        MILD,
      ),
    ).toStrictEqual([10000, 10000, 10000]);
  });

  it("given a distrustful and resentful observer when interpreting clenched fists then the factors multiply: 22500", () => {
    expect(
      interpretationWeights(
        signalOf("clenchedFists"),
        "anger",
        aReader(0, -10000, { resentment: 9000 }),
        MILD,
      ),
    ).toStrictEqual([22500]);
  });

  it("given a stepBack read with a distrust of -4000 when interpreting then disgust weighs 12000 and fear does not change", () => {
    expect(
      interpretationWeights(signalOf("stepBack"), "fear", aReader(0, -4000), MILD),
    ).toStrictEqual([10000, 12000]);
  });
});
