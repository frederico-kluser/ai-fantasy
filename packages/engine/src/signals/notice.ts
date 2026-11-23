/**
 * Noticing a signal (simulation-model §7): the chance that an observer who can
 * see (visual) or hear (vocal) the emitter notices one of its signals, from the
 * observer's perceptiveness, fatigue and intoxication and the distance.
 */
import { distanceBands } from "../acts/tone.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import { DISCOMFORT, URGENT } from "../domain/constants.ts";
import { clampInt, div } from "../domain/math.ts";

/** What the observer brings to noticing. */
export interface NoticeView {
  readonly perceptiveness: Bp;
  readonly fatigue: Bp;
  readonly intoxication: Bp;
}

/** The chance of an alert observer before perceptiveness. */
const NOTICE_BASE = 7000;
/** Perceptiveness counts a fifth. */
const PERCEPTIVENESS_DIVISOR = 5;
/** The alert chance stops here. */
const NOTICE_MAX = 9500;
/** Lost by a tired (`fatigue` ≥ 7500) or altered (`intoxication` ≥ 5000) observer. */
const IMPAIRED_PENALTY = 2000;
/** Lost per band of distance above 3 cells (4–6: 1; 7–12: 2; more: 3). */
const PENALTY_PER_BAND = 1000;

/** Whether the observer is tired above the urgent band or altered (simulation-model §7). */
function impaired(observer: NoticeView): boolean {
  return observer.fatigue >= URGENT || observer.intoxication >= DISCOMFORT;
}

/**
 * The chance, in bp, of noticing a signal of an emitter at `distance` cells
 * (simulation-model §7):
 *
 * ```text
 * clamp(7000 + perceptiveness / 5, 0, 9500)
 *   − 2000 if fatigue ≥ 7500 or intoxication ≥ 5000
 *   − 1000 × bands of distance above 3 cells (4–6: 1; 7–12: 2; more: 3)
 * ```
 *
 * It never falls below 2000. Whether the observer can see or hear the signal
 * at all is the caller's check.
 */
export function noticeChance(observer: NoticeView, distance: number): Bp {
  const alert = clampInt(
    NOTICE_BASE + div(observer.perceptiveness, PERCEPTIVENESS_DIVISOR),
    0,
    NOTICE_MAX,
  );
  const penalty = impaired(observer) ? IMPAIRED_PENALTY : 0;
  return toBp(alert - penalty - PENALTY_PER_BAND * distanceBands(distance));
}
