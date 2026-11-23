/**
 * The causes of the signals and their intensities (simulation-model §7, first
 * table): the emotions, the greatest attraction toward someone the character
 * sees, a lie being told, the cold and three body needs.
 */
import { bondToward } from "../character/bonds.ts";
import type { CharacterState } from "../character/state.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import type { SignalCauseId } from "../presets/signals.ts";
import type { Grid } from "../space/grid.ts";
import { canSee } from "../space/sight.ts";

/** The intensity of every signal cause of one character in one tick. */
export type CauseIntensities = Readonly<Record<SignalCauseId, Bp>>;

/** What the causes read besides the character's own state. */
export interface CauseInput {
  /** The greatest attraction toward someone the character sees (see {@link visibleAttraction}). */
  readonly attraction: number;
  /** Whether the tick is one of the ticks of the character's own act with `isFalse`. */
  readonly lying: boolean;
}

/** Intensity of the `lying` cause during the ticks of a false act (simulation-model §7). */
export const LYING_INTENSITY = 7000;

/**
 * The intensities of the causes (simulation-model §7): each emotion cause is
 * the emotion; `attraction` the greatest attraction toward whom the character
 * sees; `lying` 7000 during the ticks of its own false act, else 0; `cold`
 * `max(0, −thermal)`; `fatigue`, `pain` and `intoxication` the body need.
 */
export function causeIntensities(character: CharacterState, input: CauseInput): CauseIntensities {
  const { emotions, body } = character;
  return {
    fear: emotions.fear,
    sadness: emotions.sadness,
    anger: emotions.anger,
    disgust: emotions.disgust,
    shame: emotions.shame,
    guilt: emotions.guilt,
    jealousy: emotions.jealousy,
    joy: emotions.joy,
    boredom: emotions.boredom,
    attraction: toBp(input.attraction),
    lying: toBp(input.lying ? LYING_INTENSITY : 0),
    cold: toBp(0 - body.thermal),
    fatigue: body.fatigue,
    pain: body.pain,
    intoxication: body.intoxication,
  };
}

/**
 * The greatest `attraction(X→Y)` among the others present that X sees this tick
 * (simulation-model §7 and §3.2); 0 when X sees nobody. X itself never counts.
 *
 * @param vision the sight range of the tick, in cells.
 */
export function visibleAttraction(
  character: CharacterState,
  others: readonly CharacterState[],
  grid: Grid,
  vision: number,
): Bp {
  const seen = others.filter(
    (other) => other.id !== character.id && canSee(grid, character.cell, other.cell, vision),
  );
  return toBp(
    Math.max(0, ...seen.map((other) => bondToward(character.bonds, other.id).axes.attraction)),
  );
}
