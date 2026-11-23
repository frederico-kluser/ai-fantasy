/**
 * The catalog data the acts rules read (dialogue-acts §2 and §3): the act and
 * tone presets, taken from the loaded presets by the caller, and the cost of an
 * act in ticks. Tables stay data: no rule branches on an act id here.
 */
import type { Presets } from "../presets/catalogs.ts";
import type { ActId } from "../presets/acts.ts";
import type { ToneId } from "../presets/tones.ts";
import type { ActLabel } from "./label.ts";

/** The catalogs the acts rules read: pass `{ acts, tones }` of the loaded presets. */
export type ActRules = Pick<Presets, "acts" | "tones">;

/** An act preset as loaded. */
export type ActRule = ActRules["acts"][number];

/** A tone preset as loaded. */
export type ToneRule = ActRules["tones"][number];

/**
 * The preset of `act`.
 *
 * @throws RangeError if the rules do not hold it (the loaded presets always do).
 */
export function actEntry(rules: ActRules, act: ActId): ActRule {
  const entry = rules.acts.find((candidate) => candidate.id === act);
  if (entry === undefined) {
    throw new RangeError(`the act ${act} is not in the rules`);
  }
  return entry;
}

/**
 * The preset of `tone`.
 *
 * @throws RangeError if the rules do not hold it (the loaded presets always do).
 */
export function toneEntry(rules: ActRules, tone: ToneId): ToneRule {
  const entry = rules.tones.find((candidate) => candidate.id === tone);
  if (entry === undefined) {
    throw new RangeError(`the tone ${tone} is not in the rules`);
  }
  return entry;
}

/**
 * The cost of an act in ticks (dialogue-acts §2): the `ticks` of its preset, or
 * its `secretTicks` when the topic is a `SECRET` (only `TELL` has them: 6).
 * Movement acts cost 1 tick and only set a destination (simulation-model §8.1).
 *
 * @example
 * actTicks(rules, tellOfASecret); // 6
 */
export function actTicks(rules: ActRules, label: ActLabel): number {
  const entry = actEntry(rules, label.act);
  return label.topic.type === "SECRET" ? (entry.secretTicks ?? entry.ticks) : entry.ticks;
}
