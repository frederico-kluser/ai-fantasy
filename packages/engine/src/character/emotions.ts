/**
 * Emotions (simulation-model §5.2): unipolar intensities that return to a
 * baseline every tick, then take the gains of the tick: associations with
 * present tags (§5.7), boredom and the body. Per-tick gains use no trait
 * factor; gains from acts belong to the acts rules (§9).
 */
import { toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import {
  ASSOCIATION_FEAR_RATE,
  ASSOCIATION_JOY_RATE,
  BODY_EMOTION_RATE,
  BOREDOM_RATE,
  BOREDOM_SILENCE_RATE,
  DISCOMFORT,
  EMOTION_BASELINE_MAX,
  EMOTION_DECAY,
  SURPRISE_DECAY,
  URGENT,
} from "../domain/constants.ts";
import { BP_SCALE, clampInt, div, relax } from "../domain/math.ts";
import { EMOTION_IDS, type EmotionId } from "../presets/emotions.ts";
import type { Body } from "./body.ts";
import type { Traits } from "./traits.ts";

/** The intensity of every emotion of a character (or its baselines). */
export type Emotions = { readonly [K in EmotionId]: Bp };

/**
 * The shift of each emotion baseline left by the history (presets §7), kept
 * apart from the traits so the baselines can be recomputed when a trait
 * crystallizes (simulation-model §13 item 5) without losing what the limit
 * of 3000 cut. Bipolar: a history event may lower a baseline.
 */
export type EmotionShifts = { readonly [K in EmotionId]: BipolarBp };

/** Deltas of some emotions. */
export type EmotionDeltas = Partial<Record<EmotionId, number>>;

/**
 * What the tick going on does to boredom (simulation-model §5.2): a tick of
 * silence, a tick of an act that does not interest the character, or of one
 * that does. Whether an act interests someone is the acts rules' call.
 */
export type BoredomSource = "SILENCE" | "UNINTERESTING_ACT" | "INTERESTING_ACT";

/** What else moves the emotions during a tick. */
export interface EmotionTickInput {
  /** The body after this tick's update (the body comes first, §16 step 6). */
  readonly body: Body;
  /** The valences of the character's associations with present tags (§5.7), in any order. */
  readonly tagValences: readonly number[];
  readonly boredom: BoredomSource;
}

/** Fear or anger from which the body tires faster (simulation-model §5.1). */
const AROUSAL_LEVEL = 7000;

/** Boredom gained per tick by what is going on (simulation-model §5.2). */
const BOREDOM_GAIN: Readonly<Record<BoredomSource, number>> = {
  SILENCE: BOREDOM_SILENCE_RATE,
  UNINTERESTING_ACT: BOREDOM_RATE,
  INTERESTING_ACT: 0,
};

/**
 * Per-tick `relax` rate of each emotion (simulation-model §5.2): 9900, surprise
 * 9500, and boredom 10000, which keeps it as it is (boredom does not decay).
 */
const DECAY_RATES: Readonly<Record<EmotionId, number>> = {
  joy: EMOTION_DECAY,
  sadness: EMOTION_DECAY,
  fear: EMOTION_DECAY,
  anger: EMOTION_DECAY,
  disgust: EMOTION_DECAY,
  surprise: SURPRISE_DECAY,
  shame: EMOTION_DECAY,
  guilt: EMOTION_DECAY,
  jealousy: EMOTION_DECAY,
  boredom: BP_SCALE,
};

/** The body in the emotions: per-tick gains of each condition (simulation-model §5.2 table). */
const BODY_ROWS: readonly {
  readonly applies: (body: Body) => boolean;
  readonly gains: EmotionDeltas;
}[] = [
  {
    applies: (body) => body.pain >= DISCOMFORT,
    gains: { sadness: BODY_EMOTION_RATE, anger: BODY_EMOTION_RATE },
  },
  {
    applies: (body) => Math.max(body.hunger, body.thirst, body.bladder) >= URGENT,
    gains: { anger: BODY_EMOTION_RATE },
  },
  { applies: (body) => body.fatigue >= URGENT, gains: { sadness: BODY_EMOTION_RATE } },
  { applies: (body) => Math.abs(body.thermal) >= DISCOMFORT, gains: { joy: -BODY_EMOTION_RATE } },
  {
    applies: (body) => body.intoxication >= DISCOMFORT,
    gains: { joy: BODY_EMOTION_RATE, fear: -BODY_EMOTION_RATE },
  },
];

/** The baseline formulas of simulation-model §5.2; the other emotions start at 0. */
const BASELINE_FORMULAS: Readonly<Partial<Record<EmotionId, (traits: Traits) => number>>> = {
  joy: (traits) => 1000 + div(traits.humor, 4) + div(traits.sociability, 10),
  sadness: (traits) => 500 - div(traits.humor, 10),
  fear: (traits) => 500 - div(traits.courage, 10),
  anger: (traits) => 500 + div(traits.temper, 10),
};

function emotionsFrom(value: (id: EmotionId) => number): Emotions {
  const entries = EMOTION_IDS.map((id): [EmotionId, Bp] => [id, toBp(value(id))]);
  // Every emotion id has just been given a value.
  return Object.fromEntries(entries) as Emotions;
}

/**
 * The baselines of a character (simulation-model §5.2): joy
 * `1000 + humor / 4 + sociability / 10`, sadness `500 − humor / 10`, fear
 * `500 − courage / 10`, anger `500 + temper / 10`, the others 0; plus the
 * `shifts` of the history (presets §7); each limited to `0..3000`.
 */
export function emotionBaselines(traits: Traits, shifts: EmotionDeltas = {}): Emotions {
  return emotionsFrom((id) =>
    clampInt((BASELINE_FORMULAS[id]?.(traits) ?? 0) + (shifts[id] ?? 0), 0, EMOTION_BASELINE_MAX),
  );
}

/**
 * Every emotion back toward its baseline (simulation-model §5.2):
 * `relax(v, base, 9900)`, surprise at 9500, boredom unchanged.
 */
export function decayEmotions(emotions: Emotions, baselines: Emotions): Emotions {
  return emotionsFrom((id) => relax(emotions[id], baselines[id], DECAY_RATES[id]));
}

function tagGains(valences: readonly number[]): EmotionDeltas {
  const fears = valences.filter((valence) => valence < 0).length;
  const attachments = valences.filter((valence) => valence > 0).length;
  return { fear: fears * ASSOCIATION_FEAR_RATE, joy: attachments * ASSOCIATION_JOY_RATE };
}

/** The gains of a tick (simulation-model §5.2 and §5.7), summed by emotion (0 when none). */
export function emotionGains(input: EmotionTickInput): Readonly<Record<EmotionId, number>> {
  const parts: readonly EmotionDeltas[] = [
    tagGains(input.tagValences),
    { boredom: BOREDOM_GAIN[input.boredom] },
    ...BODY_ROWS.filter((row) => row.applies(input.body)).map((row) => row.gains),
  ];
  const entries = EMOTION_IDS.map((id): [EmotionId, number] => [
    id,
    parts.reduce((total, part) => total + (part[id] ?? 0), 0),
  ]);
  // Every emotion id has just been given a value.
  return Object.fromEntries(entries) as Record<EmotionId, number>;
}

/**
 * The emotions after one tick (simulation-model §5.2 and §16 step 6.3): first
 * the decay, then the gains of the tick, each clamped to `0..10000`.
 */
export function emotionsTick(
  emotions: Emotions,
  baselines: Emotions,
  input: EmotionTickInput,
): Emotions {
  const decayed = decayEmotions(emotions, baselines);
  const gains = emotionGains(input);
  return emotionsFrom((id) => decayed[id] + gains[id]);
}

/** Fear or anger at 7000 or more: the body tires faster (simulation-model §5.1). */
export function isAroused(emotions: Emotions): boolean {
  return Math.max(emotions.fear, emotions.anger) >= AROUSAL_LEVEL;
}
