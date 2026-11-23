/**
 * The slice clock (simulation-model §2 and §3.2): ticks of 5 seconds of fiction
 * turn into minutes of the day, and minutes into the phases of the day.
 */
import { TICK_SECONDS } from "../domain/constants.ts";
import { itemAt } from "../domain/lookup.ts";
import { div } from "../domain/math.ts";

/** Minutes in a day: the clock wraps around at 1440 (simulation-model §2). */
export const MINUTES_PER_DAY = 1440;

const SECONDS_PER_MINUTE = 60;

/** The phases of the day, in the order they come from midnight (simulation-model §3.2). */
export const DAY_PHASES = ["DAWN", "MORNING", "AFTERNOON", "EVENING", "LATE_NIGHT"] as const;

/** A phase of the day. */
export type DayPhase = (typeof DAY_PHASES)[number];

/**
 * The first minute of each phase of {@link DAY_PHASES}, in the same order: each
 * phase lasts until the next one starts (simulation-model §3.2).
 */
const PHASE_STARTS: readonly number[] = [0, 300, 720, 1080, 1320];

function requireMinute(minute: number): number {
  if (!Number.isInteger(minute) || minute < 0 || minute >= MINUTES_PER_DAY) {
    throw new RangeError(`a minute of the day must be an integer in 0..1439, got ${minute}`);
  }
  return minute;
}

function requireTick(tick: number): number {
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new RangeError(`a tick must be a safe integer ≥ 0, got ${tick}`);
  }
  return tick;
}

/**
 * The minute of the day `tick` ticks after the start of a slice that began at
 * `startMinute`: `(startMinute + div(tick × 5, 60)) mod 1440` (simulation-model §2).
 *
 * @example
 * minuteOfDay(1430, 144); // 2: 144 ticks are 12 minutes, past midnight
 * @throws RangeError if `startMinute` is not an integer in `0..1439` or `tick` is
 * not a safe integer ≥ 0.
 */
export function minuteOfDay(startMinute: number, tick: number): number {
  const elapsed = div(requireTick(tick) * TICK_SECONDS, SECONDS_PER_MINUTE);
  return (requireMinute(startMinute) + elapsed) % MINUTES_PER_DAY;
}

/**
 * The phase of the day at `minute`: `DAWN` `[0, 300)`, `MORNING` `[300, 720)`,
 * `AFTERNOON` `[720, 1080)`, `EVENING` `[1080, 1320)` and `LATE_NIGHT`
 * `[1320, 1440)` (simulation-model §3.2).
 *
 * @throws RangeError if `minute` is not an integer in `0..1439`.
 */
export function dayPhase(minute: number): DayPhase {
  requireMinute(minute);
  // DAWN starts at minute 0, so a valid minute always finds its phase.
  return itemAt(
    DAY_PHASES,
    PHASE_STARTS.findLastIndex((firstMinute) => minute >= firstMinute),
  );
}
