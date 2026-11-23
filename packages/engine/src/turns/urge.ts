/**
 * The urge to act (simulation-model §11 item 2) of each present character
 * who is not leaving:
 *
 * ```text
 * urge = 2000 + (sociability + 10000) × 3000 / 20000
 *      + 4000 if the last act was addressed to it (+1000 if it left it an obligation)
 *      + mulBp(highest emotion, 3000)
 *      + mulBp(social pressure, 2000)
 *      + min(silent ticks × 50, 3000) × (sociability + 10000) / 20000
 *      − max(0, fatigue − 5000) / 2
 * ```
 */
import type { Obligation } from "../acts/obligations.ts";
import { DRIVE_LEVELS } from "../character/drives.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { DISCOMFORT } from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { BP_SCALE, div, mulBp } from "../domain/math.ts";
import type { Fact } from "../memory/fact.ts";
import { DRIVE_IDS } from "../presets/drives.ts";
import { EMOTION_IDS } from "../presets/emotions.ts";
import { isDirectedTo, lastAct } from "../decision/facts.ts";
import { pressure } from "../decision/utility.ts";

/** What the urge reads besides the character. */
export interface UrgeContext {
  /** The ids of everyone present. */
  readonly present: readonly CharacterId[];
  readonly facts: readonly Fact[];
  readonly obligations: readonly Obligation[];
  readonly silentTicks: number;
}

const BASE = 2000;
const SOCIABILITY_SHARE = 3000;
const SOCIABILITY_SPAN = 2 * BP_SCALE;
const ADDRESSED = 4000;
const OWES_THE_LAST = 1000;
const EMOTION_FACTOR = 3000;
const PRESSURE_FACTOR = 2000;
const SILENCE_STEP = 50;
const SILENCE_CAP = 3000;
/** The social levels of Maslow's pyramid (simulation-model §11 item 2): 3 to 5. */
const SOCIAL_LEVEL = 3;

/**
 * The social pressure (simulation-model §11 item 2): the highest
 * `mulBp(effectiveWeight(v), deficit(v))` among the drives of levels 3 to 5;
 * a directed drive reads its highest target among the others present.
 */
export function socialPressure(character: CharacterState, present: readonly CharacterId[]): number {
  const targets = present.filter((id) => id !== character.id);
  const pressures = DRIVE_IDS.filter((drive) => DRIVE_LEVELS[drive] >= SOCIAL_LEVEL).flatMap(
    (drive) => [
      pressure(character.drives, drive, null),
      ...targets.map((target) => pressure(character.drives, drive, target)),
    ],
  );
  return Math.max(0, ...pressures);
}

/** `4000` if the last act was addressed to the character, `+1000` if it owes an answer to it. */
function addressedTerm(character: CharacterState, context: UrgeContext): number {
  const last = lastAct(context.facts);
  if (last === undefined || !isDirectedTo(last, character)) {
    return 0;
  }
  const owes = context.obligations.some(
    (owed) => owed.fact === last.id && owed.debtor === character.id,
  );
  return ADDRESSED + (owes ? OWES_THE_LAST : 0);
}

/** The urge to act of `character` (see the module comment). Not state: not limited. */
export function urgeToAct(character: CharacterState, context: UrgeContext): number {
  const sociable = effectiveTrait(character.traits, character.tendencies, "sociability") + BP_SCALE;
  const emotion = Math.max(...EMOTION_IDS.map((id) => character.emotions[id]));
  const silence = Math.min(context.silentTicks * SILENCE_STEP, SILENCE_CAP);
  return (
    BASE +
    div(sociable * SOCIABILITY_SHARE, SOCIABILITY_SPAN) +
    addressedTerm(character, context) +
    mulBp(emotion, EMOTION_FACTOR) +
    mulBp(socialPressure(character, context.present), PRESSURE_FACTOR) +
    div(silence * sociable, SOCIABILITY_SPAN) -
    div(Math.max(0, character.body.fatigue - DISCOMFORT), 2)
  );
}
