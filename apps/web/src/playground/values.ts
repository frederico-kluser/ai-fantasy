/**
 * Small value conversions of the form: the start minute as a clock time and
 * new seeds. Seeds are drawn here, in the site, never in the engine
 * (simulation-model §15): the engine only receives them.
 */

const TIME = /^(\d{1,2}):(\d{2})$/;
const HOURS = 24;
const MINUTES = 60;

/** The minute of the day as `HH:MM`. */
export function timeOf(minute: number): string {
  const hours = String(Math.trunc(minute / MINUTES)).padStart(2, "0");
  return `${hours}:${String(minute % MINUTES).padStart(2, "0")}`;
}

/** The minute of the day of an `HH:MM` time, or `null` when it is not one. */
export function minuteOf(time: string): number | null {
  const match = TIME.exec(time);
  const hours = Number(match?.[1] ?? HOURS);
  const minutes = Number(match?.[2] ?? MINUTES);
  return hours < HOURS && minutes < MINUTES ? hours * MINUTES + minutes : null;
}

/** What a seed needs: a source of random 32-bit words (`crypto` fits). */
export interface RandomSource {
  getRandomValues(array: Uint32Array<ArrayBuffer>): Uint32Array<ArrayBuffer>;
}

/** A new seed in `0..2^32 − 1`, from the browser's random source by default. */
export function randomSeed(source: RandomSource = crypto): number {
  return source.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
