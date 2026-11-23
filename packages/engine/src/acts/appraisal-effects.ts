/**
 * From effect terms to deltas (dialogue-acts §7.1 and §7.2): the unit of an
 * act, the multipliers of the tone read (as data), and the order of
 * calculation of each effect, every step truncating: `k × u` (or
 * `k × (u / 2)` for bonds) → tone multiplier → the tone's extras (terms of
 * their own, with no multiplier) → trait factor of the emotion → special factor
 * of the row → the cap of the bonds (`finalizeDeltas`, per act).
 */
import { bondToward, type BondAxes } from "../character/bonds.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import type { BipolarBp, Bp } from "../domain/bp.ts";
import { EFFECT_UNIT_MAX } from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { BP_SCALE, div, mulBp } from "../domain/math.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import type { DriveId } from "../presets/drives.ts";
import { isDirected } from "../character/drives.ts";
import type { EmotionId } from "../presets/emotions.ts";
import type { ToneId } from "../presets/tones.ts";
import type { TraitId } from "../presets/traits.ts";
import type { StateDelta } from "./deltas.ts";
import {
  bondTerm as bond,
  driveTerm as drive,
  emotionTerm as emotion,
  REQUEST_DRIVE_REFS,
  type DriveRef,
  type EffectTerm,
  type RequestDriveRef,
} from "./effect-terms.ts";
import { VALENCE_MAX } from "./appraisal-table.ts";

/** How the tone read modulates a row (dialogue-acts §7.2). */
export interface ToneModulation {
  /** The multiplier of the effects good for the one who appraises, in bp. */
  readonly positive: number;
  /** The multiplier of the effects bad for the one who appraises, in bp. */
  readonly negative: number;
  /** The valence after the tone, in `−3..+3`. */
  readonly valence: number;
  /** The extra terms of the tone, added after the multipliers. */
  readonly extras: readonly EffectTerm[];
}

/** What the tone rules read of the one who appraises: its bond toward the author and its boldness. */
export interface ModulationView {
  readonly bond: BondAxes;
  /** The effective trait (simulation-model §13 item 3). */
  readonly romanticBoldness: BipolarBp;
}

/** The unit and the multipliers a list of terms is scaled with. */
export interface Scaling {
  readonly unit: number;
  readonly positive: number;
  readonly negative: number;
}

/** No multiplier: the extras of a tone, the rows of `TOUCH`, the effects in who acts. */
export const NEUTRAL_SCALING = { positive: BP_SCALE, negative: BP_SCALE } as const;

/** Affection from which a playful tone softens (dialogue-acts §7.2). */
const PLAYFUL_AFFECTION = 5000;
/** Attraction from which a seductive tone is welcome. */
const SEDUCTIVE_ATTRACTION = 5000;
const HALF = 5000;
const WARM_POSITIVE = 12000;
const IRONIC_POSITIVE = 2500;
const AGGRESSIVE_NEGATIVE = 15000;

type ModulationRule = (
  view: ModulationView,
  valence: number,
) => Omit<ToneModulation, "valence"> & {
  readonly valence: number;
};

const SAME = { positive: BP_SCALE, negative: BP_SCALE, extras: [] } as const;

/** The `SEDUCTIVE` rule (dialogue-acts §7.2): welcome, embarrassing or only half welcome. */
const SEDUCTIVE_CASES: readonly {
  readonly applies: (view: ModulationView) => boolean;
  readonly rule: ModulationRule;
}[] = [
  {
    applies: (view) => view.bond.attraction >= SEDUCTIVE_ATTRACTION,
    rule: (_view, valence) => ({
      ...SAME,
      valence: valence + 1,
      extras: [bond("attraction", 1), drive("desire", -1)],
    }),
  },
  {
    applies: (view) => view.romanticBoldness < 0,
    rule: (_view, valence) => ({
      ...SAME,
      positive: 0,
      valence: valence - 1,
      extras: [emotion("shame", 2), emotion("disgust", 1), drive("dignity", 1)],
    }),
  },
];

/** Not attracted but bold: positives halved, valence kept. */
const SEDUCTIVE_OTHERWISE: ModulationRule = (_view, valence) => ({
  ...SAME,
  positive: HALF,
  valence,
});

/** dialogue-acts §7.2, one rule per tone read. */
const TONE_RULES: Readonly<Record<ToneId, ModulationRule>> = {
  WARM: (_view, valence) => ({ ...SAME, positive: WARM_POSITIVE, valence }),
  NEUTRAL: (_view, valence) => ({ ...SAME, valence }),
  PLAYFUL: (view, valence) => {
    const softened = view.bond.affection >= PLAYFUL_AFFECTION;
    return {
      ...SAME,
      negative: softened ? HALF : BP_SCALE,
      valence: valence + (softened && valence < 0 ? 1 : 0),
    };
  },
  SEDUCTIVE: (view, valence) =>
    (SEDUCTIVE_CASES.find((entry) => entry.applies(view))?.rule ?? SEDUCTIVE_OTHERWISE)(
      view,
      valence,
    ),
  IRONIC: (_view, valence) => ({
    ...SAME,
    positive: IRONIC_POSITIVE,
    valence: Math.min(valence, 0) - 1,
    extras: [
      bond("resentment", 1),
      bond("respect", -1),
      ...(valence >= 1 ? [emotion("anger", 1), emotion("shame", 1)] : []),
    ],
  }),
  AGGRESSIVE: (_view, valence) => ({
    positive: 0,
    negative: AGGRESSIVE_NEGATIVE,
    valence: Math.min(valence, 0) - 2,
    extras: [emotion("fear", 1), emotion("anger", 1)],
  }),
};

/** Resolves the drive of a request (the object's or the request's), or `null` to drop the term. */
export type RequestDrives = (ref: RequestDriveRef) => DriveId | null;

function isRequestDrive(ref: DriveRef): ref is RequestDriveRef {
  return (REQUEST_DRIVE_REFS as readonly string[]).includes(ref);
}

/** The unit of an act: `u = mulBp(800, intensity)` (dialogue-acts §7.1, `EFFECT_UNIT_MAX`). */
export function effectUnit(intensity: Bp): number {
  return mulBp(EFFECT_UNIT_MAX, intensity);
}

/**
 * How the tone read modulates a row of valence `valence` (dialogue-acts §7.2):
 * the multipliers of the good and the bad effects, the new valence (kept in
 * `−3..+3`) and the extra terms.
 */
export function toneModulation(
  tone: ToneId,
  view: ModulationView,
  valence: number,
): ToneModulation {
  const modulation = TONE_RULES[tone](view, valence);
  return {
    ...modulation,
    valence: Math.max(-VALENCE_MAX, Math.min(VALENCE_MAX, modulation.valence)),
  };
}

/** Effects good for whoever feels them when they rise (dialogue-acts §7.2). */
const GOOD_EMOTIONS: readonly EmotionId[] = ["joy"];
const NEUTRAL_EMOTIONS: readonly EmotionId[] = ["surprise"];
const GOOD_AXES: readonly BondAxisId[] = [
  "trust",
  "affection",
  "respect",
  "attraction",
  "closeness",
];
const NEUTRAL_AXES: readonly BondAxisId[] = ["dependence"];

/** +1 when `id` is good, 0 when neutral, −1 when bad. */
function classify<T>(id: T, good: readonly T[], neutral: readonly T[]): number {
  return Number(good.includes(id)) - Number(!good.includes(id) && !neutral.includes(id));
}

/** +1 when a rise is good, −1 when it is bad, 0 when neutral (a deficit that rises is bad). */
const GOODNESS: {
  readonly [K in EffectTerm["kind"]]: (term: Extract<EffectTerm, { kind: K }>) => number;
} = {
  EMOTION: (term) => classify(term.emotion, GOOD_EMOTIONS, NEUTRAL_EMOTIONS),
  BOND: (term) => classify(term.axis, GOOD_AXES, NEUTRAL_AXES),
  DRIVE: () => -1,
};

/** The trait factors of the emotion gains from acts (simulation-model §5.6). */
type TraitFactor = (who: CharacterState) => number;

/** `10000 + sign × trait / 2`, with the effective trait. */
function factorOf(trait: TraitId, sign: number): TraitFactor {
  return (who) => BP_SCALE + sign * div(effectiveTrait(who.traits, who.tendencies, trait), 2);
}

const NO_FACTOR: TraitFactor = () => BP_SCALE;

const TRAIT_FACTORS: Readonly<Record<EmotionId, TraitFactor>> = {
  joy: NO_FACTOR,
  sadness: NO_FACTOR,
  fear: factorOf("courage", -1),
  anger: factorOf("temper", 1),
  disgust: NO_FACTOR,
  surprise: NO_FACTOR,
  shame: NO_FACTOR,
  guilt: factorOf("honesty", 1),
  jealousy: NO_FACTOR,
  boredom: NO_FACTOR,
};

function goodness(term: EffectTerm): number {
  // The table entry of a kind takes exactly the terms of that kind.
  const of = GOODNESS[term.kind] as (entry: EffectTerm) => number;
  return of(term);
}

/** `k × u`, or `k × (u / 2)` for a bond, through the tone multiplier. */
function multiplied(term: EffectTerm, scaling: Scaling): number {
  const amount = term.k * (term.kind === "BOND" ? div(scaling.unit, 2) : scaling.unit);
  const good = goodness(term);
  if (good === 0) {
    return amount;
  }
  // Good when the change goes the way that is good for whoever feels it.
  return mulBp(amount, Math.sign(amount) === good ? scaling.positive : scaling.negative);
}

/** The trait factor of an emotion gain, then the special factor of the row. */
function emotionAmount(
  term: Extract<EffectTerm, { kind: "EMOTION" }>,
  amount: number,
  who: CharacterState,
  toward: CharacterId,
): number {
  // Only the gain takes the factor: the loss part is kept as it is.
  const gained = mulBp(Math.max(amount, 0), TRAIT_FACTORS[term.emotion](who)) + Math.min(amount, 0);
  const fearOf = bondToward(who.bonds, toward).axes.fearOf;
  return term.byFearOf === true ? mulBp(gained, BP_SCALE + fearOf) : gained;
}

function deltaOf(
  term: EffectTerm,
  who: CharacterState,
  toward: CharacterId,
  scaling: Scaling,
  drives: RequestDrives,
): StateDelta[] {
  const amount = multiplied(term, scaling);
  if (term.kind === "EMOTION") {
    const delta = emotionAmount(term, amount, who, toward);
    return [{ kind: "EMOTION", who: who.id, emotion: term.emotion, delta }];
  }
  if (term.kind === "BOND") {
    return [{ kind: "BOND", who: who.id, toward, axis: term.axis, delta: amount }];
  }
  const id = isRequestDrive(term.drive) ? drives(term.drive) : term.drive;
  return id === null
    ? []
    : [
        {
          kind: "DRIVE",
          who: who.id,
          drive: id,
          toward: isDirected(id) ? toward : null,
          delta: amount,
        },
      ];
}

/**
 * The deltas of `terms` in `who`, whose counterpart is `toward` (dialogue-acts
 * §7.1 and §7.2): each term goes through the order of calculation; bonds and
 * directed drives are toward the counterpart; `drives` resolves the drives of
 * a request (`RECEIVER`, `GIVER`, `REQUESTED`), or drops the term with `null`.
 */
export function termDeltas(
  terms: readonly EffectTerm[],
  who: CharacterState,
  toward: CharacterId,
  scaling: Scaling,
  drives: RequestDrives,
): StateDelta[] {
  return terms.flatMap((term) => deltaOf(term, who, toward, scaling, drives));
}
