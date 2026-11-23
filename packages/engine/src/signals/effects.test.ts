import { describe, expect, it } from "vitest";

import { aPerception } from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import { applyInterpretation } from "./effects.ts";

const MIDDLE = {
  perceivedThreat: 5000,
  perceivedHostility: 5000,
  perceivedInterest: 5000,
  perceivedSincerity: 5000,
};

describe("applyInterpretation (simulation-model §7, effects on the perception)", () => {
  it("given an interpreted anger signal when updating perception then perceived hostility rises by 1500 and the apparent emotion is anger at 6000", () => {
    const after = applyInterpretation(aPerception(2, MIDDLE), "anger");

    expect([after.perceivedHostility, after.apparentEmotion]).toStrictEqual([
      6500,
      { emotion: "anger", intensity: 6000 },
    ]);
  });

  it("given an interpreted anger signal when updating perception then perceived threat rises by 1000", () => {
    expect(applyInterpretation(aPerception(2, MIDDLE), "anger").perceivedThreat).toBe(6000);
  });

  it.each([
    ["disgust", "perceivedHostility", 6000],
    ["jealousy", "perceivedHostility", 5500],
    ["lying", "perceivedSincerity", 3500],
    ["attraction", "perceivedInterest", 6500],
    ["joy", "perceivedInterest", 5500],
    ["boredom", "perceivedInterest", 4000],
  ] as const)(
    "given an interpreted %s signal when updating perception then %s becomes %i",
    (cause, key, expected) => {
      expect(applyInterpretation(aPerception(2, MIDDLE), cause)[key]).toBe(expected);
    },
  );

  it.each([
    "fear",
    "sadness",
    "shame",
    "guilt",
    "cold",
    "fatigue",
    "pain",
    "intoxication",
  ] as const)(
    "given an interpreted %s signal when updating perception then the four values do not change",
    (cause) => {
      const after = applyInterpretation(aPerception(2, MIDDLE), cause);

      expect([
        after.perceivedThreat,
        after.perceivedHostility,
        after.perceivedInterest,
        after.perceivedSincerity,
      ]).toStrictEqual([5000, 5000, 5000, 5000]);
    },
  );

  it("given hostility 9000 when interpreting anger then hostility stops at 10000", () => {
    const after = applyInterpretation(aPerception(2, { perceivedHostility: 9000 }), "anger");

    expect(after.perceivedHostility).toBe(10000);
  });

  it("given interest 500 when interpreting boredom then interest stops at 0", () => {
    const after = applyInterpretation(aPerception(2, { perceivedInterest: 500 }), "boredom");

    expect(after.perceivedInterest).toBe(0);
  });

  it.each(["fear", "sadness", "disgust", "shame", "guilt", "jealousy", "joy", "boredom"] as const)(
    "given an interpreted %s signal when updating perception then it is the apparent emotion at 6000",
    (cause) => {
      expect(applyInterpretation(aPerception(2), cause).apparentEmotion).toStrictEqual({
        emotion: cause,
        intensity: 6000,
      });
    },
  );

  it.each(["attraction", "lying", "cold", "fatigue", "pain", "intoxication"] as const)(
    "given an apparent fear and an interpreted %s signal when updating perception then the apparent emotion stays",
    (cause) => {
      const fear = { emotion: "fear", intensity: toBp(3000) } as const;

      expect(applyInterpretation(aPerception(2, {}, fear), cause).apparentEmotion).toStrictEqual(
        fear,
      );
    },
  );

  it("given an apparent fear when interpreting joy then joy replaces it", () => {
    const fear = { emotion: "fear", intensity: toBp(9000) } as const;

    expect(applyInterpretation(aPerception(2, {}, fear), "joy").apparentEmotion).toStrictEqual({
      emotion: "joy",
      intensity: 6000,
    });
  });

  it.each(["cold", "fatigue", "pain", "intoxication"] as const)(
    "given an interpreted %s signal when updating perception then its mark enters the apparent state",
    (cause) => {
      expect(applyInterpretation(aPerception(2), cause).apparentState).toStrictEqual([
        { mark: cause, ticksUnconfirmed: 0 },
      ]);
    },
  );

  it("given a cold mark seen 30 ticks ago when interpreting pain then the pain mark goes to the end", () => {
    const cold = { mark: "cold", ticksUnconfirmed: 30 } as const;

    expect(
      applyInterpretation(aPerception(2, {}, null, [cold]), "pain").apparentState,
    ).toStrictEqual([cold, { mark: "pain", ticksUnconfirmed: 0 }]);
  });

  it("given a cold mark seen 30 ticks ago when interpreting cold again then the mark is confirmed in place", () => {
    const marks = [
      { mark: "cold", ticksUnconfirmed: 30 },
      { mark: "pain", ticksUnconfirmed: 5 },
    ] as const;

    expect(
      applyInterpretation(aPerception(2, {}, null, marks), "cold").apparentState,
    ).toStrictEqual([
      { mark: "cold", ticksUnconfirmed: 0 },
      { mark: "pain", ticksUnconfirmed: 5 },
    ]);
  });

  it("given marks when interpreting an emotion then the marks do not change", () => {
    const marks = [{ mark: "cold", ticksUnconfirmed: 30 }] as const;

    expect(
      applyInterpretation(aPerception(2, {}, null, marks), "fear").apparentState,
    ).toStrictEqual(marks);
  });

  it("given a perception of character 2 when interpreting then it is still about character 2", () => {
    expect(applyInterpretation(aPerception(2), "anger").target).toBe(2);
  });
});
