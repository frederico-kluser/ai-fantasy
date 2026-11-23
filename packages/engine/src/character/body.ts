/**
 * The body (simulation-model §5.1): needs that change every tick, with the
 * phase of the day, walking, strong fear or anger and heat as modifiers, and the
 * thermal need approaching the thermal target of the cell (simulation-model
 * §3.2). Needs are unipolar (0 = fine; 10000 = critical), thermal is bipolar.
 */
import { toBipolarBp, toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import { CRITICAL, DISCOMFORT, URGENT } from "../domain/constants.ts";
import { approach, BP_SCALE, mulBp } from "../domain/math.ts";
import type { BodyNeedId } from "../presets/body.ts";
import type { DayPhase } from "../time/clock.ts";

/** A body need on the unipolar scale: every one but `thermal`. */
export type UnipolarNeedId = Exclude<BodyNeedId, "thermal">;

/** The body of a character: the unipolar needs and the bipolar thermal need. */
export type Body = { readonly [K in UnipolarNeedId]: Bp } & { readonly thermal: BipolarBp };

/** What else moves the body during a tick. */
export interface BodyTickInput {
  /** The phase of the day of the tick (fatigue grows faster at dawn and late at night). */
  readonly phase: DayPhase;
  /** Cells entered during the tick (`moveTick`, simulation-model §8.1): 0 or 1. */
  readonly cellsWalked: number;
  /** Fear or anger at 7000 or more (see `isAroused`). */
  readonly aroused: boolean;
  /** The thermal target of the character's cell (see `thermalTarget`, simulation-model §3.2). */
  readonly thermalTarget: BipolarBp;
}

/** The band of a need (simulation-model §5.1). */
export type NeedBand = "NONE" | "DISCOMFORT" | "URGENT" | "CRITICAL";

/** Change per tick of each unipolar need, before modifiers (simulation-model §5.1 table). */
export const NEED_RATES: Readonly<Record<UnipolarNeedId, number>> = {
  fatigue: 2,
  hunger: 1,
  thirst: 2,
  bladder: 3,
  pain: -1,
  intoxication: -1,
};

/** Factor, in bp, of the fatigue rate in each phase: ×2 at dawn, ×1.5 late at night. */
const FATIGUE_PHASE_FACTOR: Readonly<Record<DayPhase, number>> = {
  DAWN: 20000,
  MORNING: BP_SCALE,
  AFTERNOON: BP_SCALE,
  EVENING: BP_SCALE,
  LATE_NIGHT: 15000,
};

/** Fatigue per cell walked. */
const FATIGUE_PER_CELL = 5;
/** Fatigue per tick with fear or anger at 7000 or more. */
const AROUSAL_FATIGUE = 1;
/** Thermal from which a character feels the heat (thirst rises faster). */
const HEAT_THERMAL = 3000;
/** Extra thirst per tick in the heat. */
const HEAT_THIRST = 3;
/** Share, in bp, of the distance to the thermal target covered per tick. */
const THERMAL_RATE = 50;

/** Bands from the highest threshold down (simulation-model §5.1 and §17). */
const BANDS: readonly (readonly [number, NeedBand])[] = [
  [CRITICAL, "CRITICAL"],
  [URGENT, "URGENT"],
  [DISCOMFORT, "DISCOMFORT"],
];

function fatigueRate(input: BodyTickInput): number {
  const arousal = input.aroused ? AROUSAL_FATIGUE : 0;
  const phased = mulBp(NEED_RATES.fatigue, FATIGUE_PHASE_FACTOR[input.phase]);
  return phased + FATIGUE_PER_CELL * input.cellsWalked + arousal;
}

function thirstRate(body: Body): number {
  return NEED_RATES.thirst + (body.thermal >= HEAT_THERMAL ? HEAT_THIRST : 0);
}

/**
 * The body after one tick (simulation-model §5.1 and §16 step 6.2): fatigue +2
 * (+4 at `DAWN`, +3 at `LATE_NIGHT`), +5 per cell walked and +1 with fear or
 * anger ≥ 7000; hunger +1; thirst +2, +3 more with thermal ≥ 3000; bladder +3;
 * pain and intoxication −1; thermal `approach(thermal, target, 50)`. Every
 * value is clamped to its scale.
 */
export function bodyTick(body: Body, input: BodyTickInput): Body {
  return {
    fatigue: toBp(body.fatigue + fatigueRate(input)),
    hunger: toBp(body.hunger + NEED_RATES.hunger),
    thirst: toBp(body.thirst + thirstRate(body)),
    bladder: toBp(body.bladder + NEED_RATES.bladder),
    pain: toBp(body.pain + NEED_RATES.pain),
    thermal: toBipolarBp(approach(body.thermal, input.thermalTarget, THERMAL_RATE)),
    intoxication: toBp(body.intoxication + NEED_RATES.intoxication),
  };
}

/**
 * The greatest need (simulation-model §5.1): the maximum of `fatigue`,
 * `hunger`, `thirst`, `bladder`, `pain`, `|thermal|` and `intoxication`.
 */
export function greatestNeed(body: Body): Bp {
  return toBp(
    Math.max(
      body.fatigue,
      body.hunger,
      body.thirst,
      body.bladder,
      body.pain,
      Math.abs(body.thermal),
      body.intoxication,
    ),
  );
}

/**
 * The band of a need (simulation-model §5.1): discomfort ≥ 5000, urgent ≥ 7500,
 * critical ≥ 9000. For thermal, pass its magnitude.
 */
export function needBand(value: number): NeedBand {
  return BANDS.find(([threshold]) => value >= threshold)?.[1] ?? "NONE";
}
