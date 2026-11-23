/**
 * Threat and presence (simulation-model §6): every tick each character feels a
 * threat level from the place, the light, its associations with the present
 * tags and who is near — a feared person raises it, a trusted one lowers it,
 * the more the closer. The threat feeds the `physical_safety` deficit. These
 * are pure functions on plain values, reused by signals (SOC-02) and decisions
 * (SOC-04); `characterThreat` reads them from the character state.
 */
import { toBp, type Bp } from "../domain/bp.ts";
import { DARK_THREAT } from "../domain/constants.ts";
import { div, mulBp } from "../domain/math.ts";
import type { LightLevel } from "../time/light.ts";

/** How X sees one present Y: the menace and relief axes, and Y's proximity. */
export interface PresenceView {
  /** `fearOf(X→Y)`. */
  readonly fearOf: Bp;
  /** `resentment(X→Y)`. */
  readonly resentment: Bp;
  /** `perceivedThreat(X→Y)` (simulation-model §5.5). */
  readonly perceivedThreat: Bp;
  /** `trust(X→Y)`. */
  readonly trust: Bp;
  /** `affection(X→Y)`. */
  readonly affection: Bp;
  /** See {@link proximity}. */
  readonly proximity: Bp;
}

/** What the threat of a character comes from (simulation-model §6). */
export interface ThreatInput {
  readonly danger: Bp;
  readonly comfort: Bp;
  readonly light: LightLevel;
  /** The valences of the character's associations with present tags (§5.7). */
  readonly tagValences: readonly number[];
  /** The others present, in any order. */
  readonly presences: readonly PresenceView[];
}

/** Proximity by distance, from the nearest band (simulation-model §6): `d ≤ 1` 10000 … `d ≤ 12` 2000. */
const PROXIMITY_BANDS: readonly (readonly [number, number])[] = [
  [1, 10000],
  [3, 7000],
  [6, 4000],
  [12, 2000],
];

/** Share, in bp, of a fear of a present tag that becomes threat (simulation-model §5.7). */
const TAG_FEAR_SHARE = 5000;
/** Share, in bp, of an attachment to a present tag that soothes the threat (simulation-model §5.7). */
const TAG_ATTACHMENT_SHARE = 3000;
/** Share, in bp, of the comfort of the place that soothes the threat (simulation-model §6). */
const COMFORT_SHARE = 2000;

/**
 * How much a present Y counts (simulation-model §6), by Chebyshev distance and
 * only if X sees or hears Y: `d ≤ 1` 10000, `d ≤ 3` 7000, `d ≤ 6` 4000,
 * `d ≤ 12` 2000; farther or unperceived, 0.
 */
export function proximity(distance: number, perceived: boolean): Bp {
  const band = PROXIMITY_BANDS.find(([limit]) => distance <= limit);
  return toBp(perceived && band !== undefined ? band[1] : 0);
}

/**
 * What one present Y adds to X's threat (simulation-model §6), negative when Y
 * soothes: `mulBp(max(fearOf, resentment, perceivedThreat), proximity) / 2 −
 * mulBp((trust + affection) / 2, proximity) / 4`.
 *
 * @example
 * // a trusted father (trust 8000, affection 9000) next to his son: −2125
 */
export function presenceThreat(view: PresenceView): number {
  const menace = Math.max(view.fearOf, view.resentment, view.perceivedThreat);
  const relief = div(view.trust + view.affection, 2);
  return div(mulBp(menace, view.proximity), 2) - div(mulBp(relief, view.proximity), 4);
}

function tagThreat(valence: number): number {
  return valence < 0
    ? mulBp(Math.abs(valence), TAG_FEAR_SHARE)
    : -mulBp(valence, TAG_ATTACHMENT_SHARE);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * The threat level of a character (simulation-model §6), on `0..10000`:
 * `danger / 2` + the fears of present tags (`mulBp(|valence|, 5000)`) − the
 * attachments (`mulBp(valence, 3000)`) + 1000 with `DARK` light + each
 * presence (see {@link presenceThreat}) − `mulBp(comfort, 2000)`.
 */
export function threatLevel(input: ThreatInput): Bp {
  return toBp(
    div(input.danger, 2) +
      sum(input.tagValences.map(tagThreat)) +
      (input.light === "DARK" ? DARK_THREAT : 0) +
      sum(input.presences.map(presenceThreat)) -
      mulBp(input.comfort, COMFORT_SHARE),
  );
}
