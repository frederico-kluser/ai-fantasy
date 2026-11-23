/**
 * The appraisal table (dialogue-acts §7.1) and the rows of the request answers
 * as the one who made the request feels them (§8.3, "No autor do pedido"), as
 * data: each row is an act, a condition, a valence and its effect terms. No
 * rule branches on an act id: the code only selects the rows whose act and
 * condition match and sums them. Ignoring an obligation has its own row,
 * {@link IGNORED_ROW} (simulation-model §10).
 */
import type { ActId } from "../presets/acts.ts";
import { REQUESTER_ROWS } from "./requests.ts";
import {
  bondTerm as bond,
  driveTerm as drive,
  emotionTerm as emotion,
  type AppraisalRow,
  type EffectTerm,
  type RowContext,
} from "./effect-terms.ts";

/** Affection from which a tease amuses and a touch or a farewell is welcome (dialogue-acts §7.1). */
const FOND = 5000;
/** Affection or attraction from which an approach is welcome and a withdrawal hurts. */
const DEAR = 6000;
/** Affection from which a warm touch is welcome. */
const WARM_TOUCH = 4000;
/** Attraction from which a seductive touch is welcome. */
const DESIRED = 5000;
/** `fearOf` from which an approach frightens. */
const FEARED = 5000;
/** Perceived sincerity from which an offer or an apology is believed. */
const SINCERE = 5000;

/** The highest magnitude of a valence (dialogue-acts §7.2: "Valências ficam em −3..+3"). */
export const VALENCE_MAX = 3;

const interests = (c: RowContext) => c.topicInterests;
const plainTell = (c: RowContext) => !c.newFact && !c.secret && !c.badFact;
const fond = (c: RowContext) => Math.max(c.bond.affection, c.bond.attraction) >= DEAR;
const feared = (c: RowContext) => c.bond.fearOf >= FEARED;
const toneIs = (tone: RowContext["tone"]) => (c: RowContext) => c.tone === tone;

const CHAT_INTERESTING: readonly EffectTerm[] = [
  emotion("joy", 1),
  bond("closeness", 1),
  drive("company", -2),
  drive("curiosity", -1),
  drive("intimacy", -1),
];
const CHAT_DULL: readonly EffectTerm[] = [drive("company", -1)];

/** dialogue-acts §7.1, in the order of the table. */
const TALK_ROWS: readonly AppraisalRow[] = [
  {
    act: "GREET",
    valence: 1,
    effects: [
      emotion("joy", 1),
      bond("affection", 1),
      bond("trust", 1),
      bond("closeness", 1),
      drive("company", -2),
    ],
  },
  { act: "CHAT", when: interests, valence: 1, effects: CHAT_INTERESTING },
  { act: "CHAT", when: (c) => !interests(c), valence: 0, effects: CHAT_DULL },
  {
    act: "ASK",
    when: (c) => c.secret || c.badFact,
    valence: 0,
    effects: [emotion("shame", 2), emotion("fear", 1)],
  },
  {
    act: "TELL",
    when: (c) => c.newFact,
    valence: 1,
    effects: [emotion("surprise", 1), bond("trust", 1), drive("curiosity", -2)],
  },
  {
    act: "TELL",
    when: (c) => c.secret,
    valence: 2,
    effects: [emotion("joy", 1), bond("trust", 2), bond("closeness", 2), drive("intimacy", -2)],
  },
  {
    act: "TELL",
    when: (c) => c.badFact,
    valence: -2,
    effects: [emotion("anger", 2), emotion("shame", 2), bond("resentment", 2), drive("dignity", 2)],
  },
  {
    act: "TELL",
    when: (c) => plainTell(c) && interests(c),
    valence: 1,
    effects: CHAT_INTERESTING,
  },
  { act: "TELL", when: (c) => plainTell(c) && !interests(c), valence: 0, effects: CHAT_DULL },
  {
    act: "PRAISE",
    valence: 2,
    effects: [
      emotion("joy", 2),
      bond("affection", 1),
      bond("respect", 1),
      drive("recognition", -3),
    ],
  },
  {
    act: "TEASE",
    when: (c) => c.tone === "PLAYFUL" && c.bond.affection >= FOND,
    valence: 1,
    effects: [emotion("joy", 2), bond("affection", 1), drive("fun", -2)],
  },
  {
    act: "TEASE",
    when: (c) => c.tone !== "PLAYFUL" || c.bond.affection < FOND,
    valence: -1,
    effects: [
      emotion("anger", 2),
      emotion("shame", 1),
      bond("respect", -1),
      bond("resentment", 2),
      drive("dignity", 2),
      drive("justice", 1),
    ],
  },
  {
    act: "ACCUSE",
    valence: -2,
    effects: [
      emotion("anger", 3),
      bond("trust", -2),
      bond("resentment", 2),
      drive("dignity", 3),
      drive("justice", 2),
    ],
  },
  {
    act: "ACCUSE",
    when: (c) => c.accusationTrue,
    valence: -2,
    effects: [emotion("shame", 2), emotion("guilt", 2)],
  },
  {
    act: "OFFER",
    when: (c) => c.sincerity >= SINCERE,
    valence: 2,
    effects: [emotion("joy", 2), bond("trust", 1), bond("affection", 1)],
  },
  {
    act: "OFFER",
    when: (c) => c.sincerity < SINCERE,
    valence: 0,
    effects: [bond("trust", -1), drive("predictability", 1)],
  },
  {
    act: "APOLOGIZE",
    when: (c) => c.sincerity >= SINCERE,
    valence: 1,
    effects: [
      emotion("anger", -2),
      emotion("sadness", -1),
      bond("resentment", -2),
      bond("trust", 1),
    ],
  },
  {
    act: "APOLOGIZE",
    when: (c) => c.sincerity < SINCERE,
    valence: -1,
    effects: [emotion("anger", 1), bond("resentment", 1)],
  },
  {
    act: "THREATEN",
    valence: -3,
    effects: [
      { kind: "EMOTION", emotion: "fear", k: 3, byFearOf: true },
      emotion("anger", 2),
      bond("fearOf", 2),
      bond("resentment", 2),
      bond("trust", -3),
      drive("physical_safety", 3),
      drive("dignity", 2),
      drive("justice", 2),
    ],
  },
];

/** dialogue-acts §7.1, from `FAREWELL` to the end of the table. */
const PRESENCE_ROWS: readonly AppraisalRow[] = [
  { act: "FAREWELL", valence: 0, effects: [drive("company", 1)] },
  {
    act: "FAREWELL",
    when: (c) => c.bond.affection >= DEAR,
    valence: 0,
    effects: [emotion("sadness", 1)],
  },
  {
    act: "TOUCH",
    when: (c) => toneIs("WARM")(c) && c.bond.affection >= WARM_TOUCH,
    valence: 2,
    effects: [emotion("joy", 2), bond("affection", 1), bond("closeness", 1), drive("intimacy", -2)],
  },
  {
    act: "TOUCH",
    when: (c) => toneIs("WARM")(c) && c.bond.affection < WARM_TOUCH,
    valence: -1,
    effects: [emotion("disgust", 1), drive("dignity", 1)],
  },
  {
    act: "TOUCH",
    when: (c) => toneIs("SEDUCTIVE")(c) && c.bond.attraction >= DESIRED,
    valence: 2,
    effects: [emotion("joy", 2), bond("attraction", 2), drive("desire", -2)],
  },
  {
    act: "TOUCH",
    when: (c) => toneIs("SEDUCTIVE")(c) && c.bond.attraction < DESIRED,
    valence: -2,
    effects: [
      emotion("disgust", 2),
      emotion("shame", 1),
      bond("resentment", 1),
      drive("dignity", 2),
    ],
  },
  {
    act: "TOUCH",
    when: (c) => toneIs("PLAYFUL")(c) && c.bond.affection >= FOND,
    valence: 1,
    effects: [emotion("joy", 1), drive("fun", -1)],
  },
  {
    act: "TOUCH",
    when: (c) => toneIs("PLAYFUL")(c) && c.bond.affection < FOND,
    valence: -1,
    effects: [emotion("anger", 1), drive("dignity", 1)],
  },
  { act: "TOUCH", when: toneIs("NEUTRAL"), valence: 0, effects: [] },
  {
    act: "TOUCH",
    when: toneIs("IRONIC"),
    valence: -1,
    effects: [emotion("anger", 1), emotion("shame", 1), bond("respect", -1), drive("dignity", 1)],
  },
  {
    act: "TOUCH",
    when: toneIs("AGGRESSIVE"),
    valence: -3,
    effects: [
      emotion("fear", 2),
      emotion("anger", 2),
      bond("fearOf", 2),
      bond("resentment", 2),
      drive("physical_safety", 2),
      drive("dignity", 2),
      drive("justice", 2),
    ],
  },
  { act: "APPROACH", valence: 0, effects: [drive("company", -1)] },
  { act: "APPROACH", when: fond, valence: 1, effects: [] },
  { act: "APPROACH", when: feared, valence: 0, effects: [emotion("fear", 1)] },
  { act: "APPROACH", when: (c) => feared(c) && !fond(c), valence: -1, effects: [] },
  { act: "WITHDRAW", valence: 0, effects: [drive("company", 1)] },
  {
    act: "WITHDRAW",
    when: (c) => c.bond.affection >= DEAR,
    valence: -1,
    effects: [emotion("sadness", 1)],
  },
];

/** The whole table, in the order of dialogue-acts §7.1. */
export const APPRAISAL_ROWS: readonly AppraisalRow[] = [
  ...TALK_ROWS,
  ...REQUESTER_ROWS,
  ...PRESENCE_ROWS,
];

/**
 * The row of `STAY_SILENT` owed (dialogue-acts §7.1), applied to the creditor
 * of every obligation ignored (simulation-model §10).
 */
export const IGNORED_ROW: AppraisalRow = {
  act: "STAY_SILENT",
  valence: -1,
  effects: [emotion("anger", 1), bond("respect", -1), drive("recognition", 2)],
};

/** The acts whose rows are already per tone and take no tone multiplier (dialogue-acts §7.2). */
export const TONE_FREE_ACTS: readonly ActId[] = ["TOUCH"];

/** The rows of `act` that apply in `context`, in table order. */
export function appraisalRows(act: ActId, context: RowContext): AppraisalRow[] {
  return APPRAISAL_ROWS.filter((row) => row.act === act && (row.when?.(context) ?? true));
}

/**
 * The valence of several rows of the same act (dialogue-acts §7.1): the one of
 * largest magnitude; on a tie, the first in table order; 0 without rows.
 */
export function combinedValence(rows: readonly AppraisalRow[]): number {
  return rows.reduce(
    (best, row) => (Math.abs(row.valence) > Math.abs(best) ? row.valence : best),
    0,
  );
}

/** The effect terms of several rows, in order: their effects sum. */
export function termsOf(rows: readonly AppraisalRow[]): EffectTerm[] {
  return rows.flatMap((row) => row.effects);
}
