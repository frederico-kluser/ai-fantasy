/**
 * Test support for the signals module: the signal catalog of the default
 * presets, random perceptions and the range check of the perceptions
 * (invariant 2 of simulation-model §18).
 */
import fc from "fast-check";

import type { Perception } from "../../src/character/perception.ts";
import { toBp } from "../../src/domain/bp.ts";
import type { CharacterId } from "../../src/domain/ids.ts";
import { EMOTION_IDS } from "../../src/presets/emotions.ts";
import { loadPresets } from "../../src/presets/load.ts";
import type { SignalRules } from "../../src/signals/rules.ts";

/** The signals of the default presets. */
export function defaultSignals(): SignalRules {
  const presets = loadPresets();
  if (!presets.ok) {
    throw new Error("test signals: the default presets do not load");
  }
  return presets.value.signals;
}

const anyBp = fc.integer({ min: 0, max: 10000 });
const markIds = fc.constantFrom<"fatigue" | "cold" | "pain" | "intoxication">(
  "fatigue",
  "cold",
  "pain",
  "intoxication",
);

/** A random perception of `target`: any values, maybe an apparent emotion, up to 2 marks. */
export function arbitraryPerception(target: number): fc.Arbitrary<Perception> {
  return fc
    .record({
      perceivedThreat: anyBp,
      perceivedHostility: anyBp,
      perceivedInterest: anyBp,
      perceivedSincerity: anyBp,
      emotion: fc.option(
        fc.record({
          emotion: fc.constantFrom(...EMOTION_IDS),
          intensity: fc.integer({ min: 1000, max: 10000 }),
        }),
      ),
      marks: fc.uniqueArray(markIds, { maxLength: 2 }),
      age: fc.integer({ min: 0, max: 59 }),
    })
    .map(({ emotion, marks, age, ...values }) => ({
      target: target as CharacterId,
      perceivedThreat: toBp(values.perceivedThreat),
      perceivedHostility: toBp(values.perceivedHostility),
      perceivedInterest: toBp(values.perceivedInterest),
      perceivedSincerity: toBp(values.perceivedSincerity),
      apparentEmotion:
        emotion === null ? null : { emotion: emotion.emotion, intensity: toBp(emotion.intensity) },
      apparentState: marks.map((mark) => ({ mark, ticksUnconfirmed: age })),
    }));
}

/** The problems of a perception: every value out of `0..10000`, a faded emotion or an old mark. */
export function perceptionProblems(perception: Perception): string[] {
  const values = [
    perception.perceivedThreat,
    perception.perceivedHostility,
    perception.perceivedInterest,
    perception.perceivedSincerity,
    perception.apparentEmotion?.intensity ?? 10000,
  ];
  const marks = perception.apparentState.map((mark) => mark.ticksUnconfirmed);
  return [
    ...values.filter((value) => !Number.isSafeInteger(value) || value < 0 || value > 10000),
    ...marks.filter((ticks) => ticks < 0 || ticks >= 60),
  ].map((value) => `${perception.target}: ${value}`);
}
