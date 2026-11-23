/**
 * The effects in whoever acts and in those it lets down (simulation-model §9,
 * §10 and §11): the author's guilt and relief (dialogue-acts §7.3), the effects
 * of answering a request (§8.3, "No alvo"), the interruption of a debtor
 * (simulation-model §11 item 4) and the row of an ignored obligation (§10).
 */
import { bondToward } from "../character/bonds.ts";
import { directedDeficit } from "../character/drives.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { toBp } from "../domain/bp.ts";
import { IGNORE_INTENSITY } from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import { effectUnit, NEUTRAL_SCALING, termDeltas } from "./appraisal-effects.ts";
import { plainDeltas, type ActScene } from "./appraisal-readers.ts";
import { IGNORED_ROW } from "./appraisal-table.ts";
import type { StateDelta } from "./deltas.ts";
import { bondTerm as bond, driveTerm as drive, emotionTerm as emotion } from "./effect-terms.ts";
import type { Obligation } from "./obligations.ts";
import { responderTerms } from "./request-answers.ts";

const HURTFUL_VALENCE = -2;
const LOVED = 6000;
const AVENGING = 5000;

/** The real valence of the act for one target (by the real tone). */
export interface RealValence {
  readonly id: CharacterId;
  readonly valence: number;
}

/**
 * What the author feels for its own act (dialogue-acts §7.3 and §8.3): `guilt`
 * +1 for a lie when its honesty is above 0; for each target hurt at valence
 * ≤ −2 by the real tone, `guilt` +1 when it loves the target (affection ≥
 * 6000), and `justice` −2 toward it, with `joy` +1 when `temper` > 0, when it
 * had justice ≥ 5000 toward it; and, answering a request, the effects of §8.3
 * in the one who answers.
 */
export function authorDeltas(scene: ActScene, realValences: readonly RealValence[]): StateDelta[] {
  const { author, label } = scene;
  const honesty = effectiveTrait(author.traits, author.tendencies, "honesty");
  const temper = effectiveTrait(author.traits, author.tendencies, "temper");
  const lied = label.isFalse && honesty > 0;
  const hurt = realValences
    .filter((entry) => entry.valence <= HURTFUL_VALENCE)
    .map((entry) => entry.id);
  const answer = scene.answer;
  return [
    ...(lied ? plainDeltas(scene, [emotion("guilt", 1)], author, author.id) : []),
    ...hurt.flatMap((target) => [
      ...(bondToward(author.bonds, target).axes.affection >= LOVED
        ? plainDeltas(scene, [emotion("guilt", 1)], author, target)
        : []),
      ...(directedDeficit(author.drives, "justice", target) >= AVENGING
        ? plainDeltas(
            scene,
            [drive("justice", -2), ...(temper > 0 ? [emotion("joy", 1)] : [])],
            author,
            target,
          )
        : []),
    ]),
    ...(answer === null
      ? []
      : plainDeltas(scene, responderTerms(answer.view), author, answer.creditor)),
  ];
}

/**
 * The interruption (simulation-model §11 item 4): each debtor of the last act's
 * obligations feels `anger` +1 (with its temper), `recognition` +1, and
 * `respect` −1 (half unit) toward the interrupter, with the unit of the act.
 */
export function interruptionDeltas(
  scene: ActScene,
  debtors: readonly CharacterState[],
): StateDelta[] {
  return debtors.flatMap((debtor) =>
    plainDeltas(
      scene,
      [emotion("anger", 1), drive("recognition", 1), bond("respect", -1)],
      debtor,
      scene.author.id,
    ),
  );
}

/**
 * Ignoring obligations (simulation-model §10): the creditor of each one takes
 * the row of `STAY_SILENT` owed (dialogue-acts §7.1) toward the debtor, with
 * the fixed intensity 5000 (`IGNORE_INTENSITY`), no tone and its own traits.
 * The scene step (SOC-05) also calls it for the obligations that expire.
 */
export function ignoringDeltas(
  characters: readonly CharacterState[],
  ignored: readonly Obligation[],
): StateDelta[] {
  const unit = effectUnit(toBp(IGNORE_INTENSITY));
  return ignored.flatMap((owed) => {
    const creditor = characters.find((character) => character.id === owed.creditor);
    return creditor === undefined
      ? []
      : termDeltas(
          IGNORED_ROW.effects,
          creditor,
          owed.debtor,
          { unit, ...NEUTRAL_SCALING },
          () => null,
        );
  });
}
