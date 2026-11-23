/**
 * How each `DIRECT` listener reads the tone of an act (dialogue-acts §3,
 * simulation-model §8.3): the misread chance from the tone's ambiguity, the
 * distance, the noise, the listener's perceptiveness and distrust and the bond
 * with the author; and, on a misreading, the draw among the tone's typical
 * confusions, weighted toward the worse by a bad bond and toward the better by
 * a good one. The reading belongs to the listener; the act keeps its real tone.
 */
import { bondToward, type BondAxes } from "../character/bonds.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { clampInt, div } from "../domain/math.ts";
import type { ToneId } from "../presets/tones.ts";
import type { Drawer } from "../rng/drawer.ts";
import { toneEntry, type ActRules } from "./rules.ts";

/** What a listener brings to the reading of a tone from one author. */
export interface ReaderView {
  readonly perceptiveness: Bp;
  /** The listener's effective trait (simulation-model §13 item 3). */
  readonly trustInOthers: BipolarBp;
  /** The listener's bond toward the author. */
  readonly bond: BondAxes;
}

/** One listener reading one tone, at a distance from the author and in the noise of the scene. */
export interface ToneReadingInput {
  /** The real tone of the act. */
  readonly tone: ToneId;
  readonly listener: CharacterId;
  readonly reader: ReaderView;
  /** Chebyshev distance between author and listener, in cells. */
  readonly distance: number;
  /** Noise of the place plus the weather (simulation-model §6). */
  readonly noise: Bp;
}

/** How a listener read the tone. */
export interface ToneReading {
  /** The tone as read: the real one, or one of its confusions. */
  readonly tone: ToneId;
  readonly misread: boolean;
  /** The misread chance that was drawn, in bp. */
  readonly chance: Bp;
}

/** The two possible confusions of a tone, with their draw weights (same order as the preset). */
export interface ConfusionWeights {
  readonly tones: readonly ToneId[];
  readonly weights: readonly number[];
}

/** The highest misread chance (dialogue-acts §3). */
const MISREAD_MAX = 9000;
/** Each band of distance above 3 cells adds this much. */
const MISREAD_PER_BAND = 500;
/** The bands of distance: one more above each limit (4–6: 1; 7–12: 2; more: 3). */
const BAND_LIMITS: readonly number[] = [3, 6, 12];
/** The divisors of the terms of the formula (dialogue-acts §3). */
const NOISE_DIVISOR = 5;
const PERCEPTIVENESS_DIVISOR = 4;
const DISTRUST_DIVISOR = 4;
const BAD_BOND_DIVISOR = 5;
const GOOD_BOND_DIVISOR = 10;
/** The base weight of a confusion. */
const CONFUSION_BASE = 10000;

/** The bands of distance above 3 cells: 0 up to 3, 1 for 4–6, 2 for 7–12, 3 beyond. */
export function distanceBands(distance: number): number {
  return BAND_LIMITS.filter((limit) => distance > limit).length;
}

/** The listener's distrust: `max(0, −trustInOthers)`. */
function distrust(reader: ReaderView): number {
  return Math.max(0, 0 - reader.trustInOthers);
}

/**
 * The chance, in bp, that a `DIRECT` listener misreads a tone (dialogue-acts §3):
 *
 * ```text
 * clamp(ambiguity + 500 × bands above 3 cells + noise / 5 − perceptiveness / 4
 *       + max(0, −trustInOthers) / 4 + max(0, resentment − trust) / 5 − affection / 10, 0, 9000)
 * ```
 */
export function misreadChance(
  ambiguity: number,
  distance: number,
  noise: Bp,
  reader: ReaderView,
): Bp {
  const { bond } = reader;
  const sum =
    ambiguity +
    MISREAD_PER_BAND * distanceBands(distance) +
    div(noise, NOISE_DIVISOR) -
    div(reader.perceptiveness, PERCEPTIVENESS_DIVISOR) +
    div(distrust(reader), DISTRUST_DIVISOR) +
    div(Math.max(0, bond.resentment - bond.trust), BAD_BOND_DIVISOR) -
    div(bond.affection, GOOD_BOND_DIVISOR);
  return toBp(clampInt(sum, 0, MISREAD_MAX));
}

/**
 * The confusions of `tone` and their weights (dialogue-acts §3): a worse one
 * weighs `10000 + resentment + max(0, −trustInOthers)`; a better one,
 * `10000 + affection + attraction`.
 */
export function confusionWeights(
  rules: ActRules,
  tone: ToneId,
  reader: ReaderView,
): ConfusionWeights {
  const { bond } = reader;
  const extra = {
    WORSE: bond.resentment + distrust(reader),
    BETTER: bond.affection + bond.attraction,
  };
  const { confusions } = toneEntry(rules, tone);
  return {
    tones: confusions.map((confusion) => confusion.tone),
    weights: confusions.map((confusion) => CONFUSION_BASE + extra[confusion.kind]),
  };
}

/** What `listener` brings to the reading of a tone from `author`. */
export function readerView(listener: CharacterState, author: CharacterId): ReaderView {
  return {
    perceptiveness: listener.aptitudes.perceptiveness,
    trustInOthers: effectiveTrait(listener.traits, listener.tendencies, "trustInOthers"),
    bond: bondToward(listener.bonds, author).axes,
  };
}

/**
 * How one `DIRECT` listener reads the tone (dialogue-acts §3). It draws the
 * misreading (`TONE_MISREAD`) and, on a misreading, the confusion
 * (`TONE_CONFUSION`, even when the tone has only one), both on the `perception`
 * stream with the listener as target, so the inspector can force either.
 */
export function readTone(drawer: Drawer, rules: ActRules, input: ToneReadingInput): ToneReading {
  const { tone, listener, reader } = input;
  const chance = misreadChance(
    toneEntry(rules, tone).ambiguity,
    input.distance,
    input.noise,
    reader,
  );
  if (!drawer.drawChance("perception", chance, "TONE_MISREAD", listener)) {
    return { tone, misread: false, chance };
  }
  const confusions = confusionWeights(rules, tone, reader);
  const index = drawer.drawWeighted("perception", confusions.weights, "TONE_CONFUSION", listener);
  // drawWeighted returns an index of the weights, which match the tones one to one.
  const read = confusions.tones[index] as ToneId;
  return { tone: read, misread: true, chance };
}
