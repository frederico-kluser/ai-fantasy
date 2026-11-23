/**
 * Test support for the character module: factories that build status layers
 * from a few overrides (testing-strategy §4: `aCharacter().withTrait(…)` style,
 * never giant copied objects) and loops that run a rule for many ticks.
 */
import { toBipolarBp, toBp, type BipolarBp, type Bp } from "../../src/domain/bp.ts";
import type { BodyNeedId } from "../../src/presets/body.ts";
import { EMOTION_IDS, type EmotionId } from "../../src/presets/emotions.ts";
import { TRAIT_IDS, type TraitId } from "../../src/presets/traits.ts";
import { bodyTick, type Body, type BodyTickInput } from "../../src/character/body.ts";
import type { Traits } from "../../src/character/traits.ts";
import {
  emotionsTick,
  type EmotionTickInput,
  type Emotions,
} from "../../src/character/emotions.ts";

/** A body at rest: every need at 0, thermal 0, with the overrides given. */
export function aBody(overrides: Partial<Record<BodyNeedId, number>> = {}): Body {
  const need = (id: Exclude<BodyNeedId, "thermal">): Bp => toBp(overrides[id] ?? 0);
  return {
    fatigue: need("fatigue"),
    hunger: need("hunger"),
    thirst: need("thirst"),
    bladder: need("bladder"),
    pain: need("pain"),
    thermal: toBipolarBp(overrides.thermal ?? 0),
    intoxication: need("intoxication"),
  };
}

/** The body after `ticks` ticks with the same input. */
export function ticksOfBody(body: Body, input: BodyTickInput, ticks: number): Body {
  let current = body;
  for (let tick = 0; tick < ticks; tick += 1) {
    current = bodyTick(current, input);
  }
  return current;
}

/** Traits (or tendencies) at 0, with the overrides given. */
export function someTraits(overrides: Partial<Record<TraitId, number>> = {}): Traits {
  const entries = TRAIT_IDS.map((id): [TraitId, BipolarBp] => [
    id,
    toBipolarBp(overrides[id] ?? 0),
  ]);
  // Every trait id has just been given a value.
  return Object.fromEntries(entries) as Traits;
}

/** Emotions (or baselines) at 0, with the overrides given. */
export function someEmotions(overrides: Partial<Record<EmotionId, number>> = {}): Emotions {
  const entries = EMOTION_IDS.map((id): [EmotionId, Bp] => [id, toBp(overrides[id] ?? 0)]);
  // Every emotion id has just been given a value.
  return Object.fromEntries(entries) as Emotions;
}

/** The emotions after `ticks` ticks with the same baselines and input. */
export function ticksOfEmotions(
  emotions: Emotions,
  baselines: Emotions,
  input: EmotionTickInput,
  ticks: number,
): Emotions {
  let current = emotions;
  for (let tick = 0; tick < ticks; tick += 1) {
    current = emotionsTick(current, baselines, input);
  }
  return current;
}
