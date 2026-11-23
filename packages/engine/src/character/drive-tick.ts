/**
 * The per-tick rules of the drives (simulation-model §5.3 table, §16 step
 * 6.4). Deficits moved by events (acts, answers, discoveries) belong to the
 * acts rules (SOC-01, SOC-03); weights never change here.
 */
import { toBp, type BipolarBp, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { approach, BP_SCALE, div } from "../domain/math.ts";
import { withDirectedDeficit, type DirectedDeficit, type Drives } from "./drives.ts";
import { pressureOf } from "./maslow.ts";

/** A value X reads of one present Y. */
export interface TowardValue {
  readonly target: CharacterId;
  readonly value: Bp;
}

/** What moves the drives during a tick. */
export interface DriveTickInput {
  /** The greatest need of the body after this tick (simulation-model §5.1). */
  readonly greatestNeed: Bp;
  /** The threat of this tick (simulation-model §6). */
  readonly threat: Bp;
  /** Whether this is a tick of silence (simulation-model §11). */
  readonly silence: boolean;
  /** The character's effective sociability. */
  readonly sociability: BipolarBp;
  /** The character's boredom after this tick's emotions. */
  readonly boredom: Bp;
  /** `attraction(X→Y)` for each Y present and visible. */
  readonly visibleAttractions: readonly TowardValue[];
  /** The apparent distress of each Y present (see `apparentDistress`). */
  readonly distresses: readonly TowardValue[];
}

/** Per-tick changes of the drives (simulation-model §5.3 table). */
const RATES = {
  /** `approach(deficit, threat, 1000)`. */
  safety: 1000,
  predictability: -1,
  company: 1,
  curiosity: 1,
  /** With boredom ≥ 5000. */
  fun: 2,
  /** `approach(deficit, attraction, 500)`. */
  desire: 500,
  /** `approach(deficit, apparent distress, 1000)`. */
  care: 1000,
} as const;

/** Boredom from which fun is missed (simulation-model §5.3). */
const FUN_BOREDOM = 5000;

/** In a tick of silence, company rises `(sociability + 10000) / 4000` more. */
const SILENCE_COMPANY_DIVISOR = 4000;

function companyRise(input: DriveTickInput): number {
  const silence = input.silence ? div(input.sociability + BP_SCALE, SILENCE_COMPANY_DIVISOR) : 0;
  return RATES.company + silence;
}

/**
 * Each listed target's deficit approaches its value at `rate`; the others stay.
 * A missing entry reads 0 and is created only when the rule moves it away from
 * 0 (simulation-model §4: an entry is created when a rule changes it).
 */
function approachEach(
  list: readonly DirectedDeficit[],
  goals: readonly TowardValue[],
  rate: number,
): readonly DirectedDeficit[] {
  return goals.reduce<readonly DirectedDeficit[]>((current, { target, value }) => {
    const entry = current.find((each) => each.target === target);
    const deficit = approach(entry?.deficit ?? 0, value, rate);
    return entry === undefined && deficit === 0
      ? current
      : withDirectedDeficit(current, target, deficit);
  }, list);
}

/**
 * The drives after one tick (simulation-model §5.3): physical relief
 * `clamp((greatest need − 5000) × 2, 0, 10000)`; physical safety
 * `approach(deficit, threat, 1000)`; predictability −1; company +1, and
 * `(sociability + 10000) / 4000` more in a tick of silence; curiosity +1; fun
 * +2 with boredom ≥ 5000; desire toward each visible Y
 * `approach(deficit, attraction, 500)`; care toward each present Y
 * `approach(deficit, apparent distress, 1000)`. Every deficit is clamped.
 */
export function drivesTick(drives: Drives, input: DriveTickInput): Drives {
  const { deficits, directed } = drives;
  return {
    weights: drives.weights,
    deficits: {
      ...deficits,
      physical_relief: pressureOf(input.greatestNeed),
      physical_safety: toBp(approach(deficits.physical_safety, input.threat, RATES.safety)),
      predictability: toBp(deficits.predictability + RATES.predictability),
      company: toBp(deficits.company + companyRise(input)),
      curiosity: toBp(deficits.curiosity + RATES.curiosity),
      fun: toBp(deficits.fun + (input.boredom >= FUN_BOREDOM ? RATES.fun : 0)),
    },
    directed: {
      ...directed,
      desire: approachEach(directed.desire, input.visibleAttractions, RATES.desire),
      care: approachEach(directed.care, input.distresses, RATES.care),
    },
  };
}
