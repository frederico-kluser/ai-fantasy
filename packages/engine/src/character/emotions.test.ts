import { describe, expect, it } from "vitest";

import { aBody, someEmotions, someTraits, ticksOfEmotions } from "../../test/support/character.ts";
import {
  decayEmotions,
  emotionBaselines,
  emotionsTick,
  isAroused,
  type EmotionTickInput,
} from "./emotions.ts";

/** A tick at rest: healthy body, no association with a present tag, an interesting act going on. */
const QUIET: EmotionTickInput = { body: aBody(), tagValences: [], boredom: "INTERESTING_ACT" };

describe("emotionBaselines (simulation-model §5.2)", () => {
  it("given neutral traits when computing baselines then joy is 1000, sadness, fear and anger 500, the rest 0", () => {
    expect(emotionBaselines(someTraits())).toStrictEqual(
      someEmotions({ joy: 1000, sadness: 500, fear: 500, anger: 500 }),
    );
  });

  it("given humor 4000, sociability 3000, courage 7000 and temper 5000 when computing baselines then the formulas hold", () => {
    const traits = someTraits({ humor: 4000, sociability: 3000, courage: 7000, temper: 5000 });

    expect(emotionBaselines(traits)).toStrictEqual(
      someEmotions({ joy: 2300, sadness: 100, fear: 0, anger: 1000 }),
    );
  });

  it("given humor 10000 and sociability 10000 when computing baselines then joy is limited to 3000", () => {
    expect(emotionBaselines(someTraits({ humor: 10000, sociability: 10000 })).joy).toBe(3000);
  });

  it("given history shifts of guilt +500 and joy +2500 when computing baselines then they add, up to 3000", () => {
    const baselines = emotionBaselines(someTraits(), { guilt: 500, joy: 2500 });

    expect([baselines.guilt, baselines.joy]).toStrictEqual([500, 3000]);
  });
});

describe("emotionsTick: decay (simulation-model §5.2)", () => {
  it("given anger 8000 and baseline 500 when 69 ticks pass then anger is 4223", () => {
    const baselines = someEmotions({ anger: 500 });

    expect(ticksOfEmotions(someEmotions({ anger: 8000 }), baselines, QUIET, 69).anger).toBe(4223);
  });

  it("given surprise 8000 and baseline 0 when a tick passes then it decays at 9500: 7600", () => {
    expect(decayEmotions(someEmotions({ surprise: 8000 }), someEmotions()).surprise).toBe(7600);
  });

  it("given boredom 3000 and baseline 0 with an interesting act when a tick passes then it does not decay", () => {
    expect(emotionsTick(someEmotions({ boredom: 3000 }), someEmotions(), QUIET).boredom).toBe(3000);
  });

  it("given joy 200 below its baseline 1000 when a tick passes then it rises toward it: 208", () => {
    expect(decayEmotions(someEmotions({ joy: 200 }), someEmotions({ joy: 1000 })).joy).toBe(208);
  });
});

describe("emotionsTick: gains of the tick (simulation-model §5.2 and §5.7)", () => {
  it("given a fear-of-forest association in a forest and fear at baseline 0 when 10 ticks pass then fear is 187 (decay before gain)", () => {
    const input = { ...QUIET, tagValences: [-6000] };

    expect(ticksOfEmotions(someEmotions(), someEmotions(), input, 10).fear).toBe(187);
  });

  it("given two fears of present tags when a tick passes then fear rises by 20 for each", () => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), { ...QUIET, tagValences: [-4000, -8000] }).fear,
    ).toBe(40);
  });

  it("given a fear, an attachment and a neutral association of present tags when a tick passes then fear +20 and joy +10", () => {
    const emotions = emotionsTick(someEmotions(), someEmotions(), {
      ...QUIET,
      tagValences: [-6000, 5000, 0],
    });

    expect([emotions.fear, emotions.joy]).toStrictEqual([20, 10]);
  });

  it("given pain exactly 5000 when a tick passes then sadness rises by 5", () => {
    const emotions = emotionsTick(someEmotions(), someEmotions(), {
      ...QUIET,
      body: aBody({ pain: 5000 }),
    });

    expect(emotions.sadness).toBe(5);
  });

  it("given an attachment to a present tag when a tick passes then joy rises by 10", () => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), { ...QUIET, tagValences: [5000] }).joy,
    ).toBe(10);
  });

  it("given boredom 3000 and nothing interesting when 40 ticks pass then boredom is 4000", () => {
    const input = { ...QUIET, boredom: "UNINTERESTING_ACT" } as const;

    expect(
      ticksOfEmotions(someEmotions({ boredom: 3000 }), someEmotions(), input, 40).boredom,
    ).toBe(4000);
  });

  it("given a tick of silence when it passes then boredom rises by 50", () => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), { ...QUIET, boredom: "SILENCE" }).boredom,
    ).toBe(50);
  });

  it("given pain 6000 and sadness and anger at baseline 0 when a tick passes then both rise by 5", () => {
    const emotions = emotionsTick(someEmotions(), someEmotions(), {
      ...QUIET,
      body: aBody({ pain: 6000 }),
    });

    expect([emotions.sadness, emotions.anger]).toStrictEqual([5, 5]);
  });

  it("given pain 4999 when a tick passes then sadness and anger do not rise", () => {
    const emotions = emotionsTick(someEmotions(), someEmotions(), {
      ...QUIET,
      body: aBody({ pain: 4999 }),
    });

    expect([emotions.sadness, emotions.anger]).toStrictEqual([0, 0]);
  });

  it.each(["hunger", "thirst", "bladder"] as const)(
    "given %s at 7500 when a tick passes then anger rises by 5",
    (need) => {
      expect(
        emotionsTick(someEmotions(), someEmotions(), { ...QUIET, body: aBody({ [need]: 7500 }) })
          .anger,
      ).toBe(5);
    },
  );

  it("given hunger, thirst and bladder all urgent when a tick passes then anger rises by 5 only once", () => {
    const body = aBody({ hunger: 9000, thirst: 9000, bladder: 9000 });

    expect(emotionsTick(someEmotions(), someEmotions(), { ...QUIET, body }).anger).toBe(5);
  });

  it("given hunger 7499 when a tick passes then anger does not rise", () => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), { ...QUIET, body: aBody({ hunger: 7499 }) })
        .anger,
    ).toBe(0);
  });

  it.each([
    [7500, 5],
    [7499, 0],
  ] as const)("given fatigue %i when a tick passes then sadness rises by %i", (fatigue, rise) => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), { ...QUIET, body: aBody({ fatigue }) }).sadness,
    ).toBe(rise);
  });

  it.each([
    [-5000, 995],
    [5000, 995],
    [4999, 1000],
  ] as const)(
    "given thermal %i and joy 1000 at its baseline when a tick passes then joy is %i",
    (thermal, joy) => {
      const baselines = someEmotions({ joy: 1000 });

      expect(emotionsTick(baselines, baselines, { ...QUIET, body: aBody({ thermal }) }).joy).toBe(
        joy,
      );
    },
  );

  it("given intoxication 5000 with fear 100 at its baseline when a tick passes then joy rises by 5 and fear falls by 5", () => {
    const baselines = someEmotions({ fear: 100 });
    const emotions = emotionsTick(baselines, baselines, {
      ...QUIET,
      body: aBody({ intoxication: 5000 }),
    });

    expect([emotions.joy, emotions.fear]).toStrictEqual([5, 95]);
  });

  it("given intoxication 4999 when a tick passes then joy does not rise", () => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), {
        ...QUIET,
        body: aBody({ intoxication: 4999 }),
      }).joy,
    ).toBe(0);
  });

  it("given joy at 0 and a cold body when a tick passes then joy stays at 0", () => {
    expect(
      emotionsTick(someEmotions(), someEmotions(), { ...QUIET, body: aBody({ thermal: -9000 }) })
        .joy,
    ).toBe(0);
  });
});

describe("isAroused (simulation-model §5.1)", () => {
  it.each([
    [{ fear: 7000 }, true],
    [{ anger: 7000 }, true],
    [{ fear: 6999, anger: 6999 }, false],
  ] as const)("given emotions %j when checking arousal then it is %s", (overrides, aroused) => {
    expect(isAroused(someEmotions(overrides))).toBe(aroused);
  });
});
