/**
 * The act as each one who perceived it appraises it (simulation-model §9,
 * dialogue-acts §7.1, §7.2 and §7.4): the targets take the whole row, read in
 * the tone they read; the other `DIRECT` listeners, the witness rules; and
 * whoever perceives a warm or seductive act toward someone they love may feel
 * jealous.
 */
import { bondToward } from "../character/bonds.ts";
import { directedDeficit } from "../character/drives.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import type { CharacterId } from "../domain/ids.ts";
import { mulBp } from "../domain/math.ts";
import type { Fact } from "../memory/fact.ts";
import type { BondLabelId } from "../presets/bonds.ts";
import type { ToneId } from "../presets/tones.ts";
import { badSubjects, rowContext, toldOffenders } from "./appraisal-context.ts";
import {
  NEUTRAL_SCALING,
  termDeltas,
  toneModulation,
  type RequestDrives,
} from "./appraisal-effects.ts";
import { appraisalRows, combinedValence, TONE_FREE_ACTS, termsOf } from "./appraisal-table.ts";
import type { StateDelta } from "./deltas.ts";
import {
  bondTerm as bond,
  driveTerm as drive,
  emotionTerm as emotion,
  type AnswerView,
  type EffectTerm,
  type RowContext,
} from "./effect-terms.ts";
import type { ActLabel } from "./label.ts";

/** The act being appraised and what every reading shares. */
export interface ActScene {
  readonly author: CharacterState;
  /** The real label. */
  readonly label: ActLabel;
  /** The record before the act. */
  readonly facts: readonly Fact[];
  /** Everyone present, before the act. */
  readonly characters: readonly CharacterState[];
  /** The unit of the act (halved for a `PARTIAL` acceptance). */
  readonly unit: number;
  readonly drives: RequestDrives;
  /** The request, question or accusation the act answers, and who made it. */
  readonly answer: { readonly view: AnswerView; readonly creditor: CharacterId } | null;
  /** In a lie about a fact, the hearers who believed it; `null` otherwise. */
  readonly believers: readonly CharacterId[] | null;
}

/** How one reader appraised the act. */
export interface Reading {
  readonly valence: number;
  readonly deltas: StateDelta[];
  readonly context: RowContext;
}

const SURPRISE_BOND = 6000;
const SURPRISE_VALENCE = 2;
const HOSTILE_VALENCE = -2;
const LOVED = 6000;
const ATTRACTED = 6000;
const JEALOUS_LABELS: readonly BondLabelId[] = ["SPOUSE", "PARTNER"];
const JEALOUS_TONES: readonly ToneId[] = ["SEDUCTIVE", "WARM"];
const WITNESS_SHARE = 5000;
/** simulation-model §9 item 4: hostility and interest per unit of valence; threat of a `THREATEN`. */
const TARGET_HOSTILITY = 1000;
const TARGET_INTEREST = 500;
const WITNESS_HOSTILITY = 500;
const THREAT_PERCEIVED: Readonly<Partial<Record<ActLabel["act"], number>>> = { THREATEN: 2000 };

/**
 * How `reader` appraises the act addressed to `subject`, in `tone`
 * (dialogue-acts §7.1 and §7.2): the rows that apply, the tone's multipliers,
 * valence and extras (none for `TOUCH`), and the deltas of the terms. Without a
 * row, valence 0 and no effect.
 */
export function readAct(
  scene: ActScene,
  reader: CharacterState,
  subject: CharacterId,
  tone: ToneId,
): Reading {
  const { label, author } = scene;
  const context = contextFor(scene, reader, subject, tone);
  const rows = appraisalRows(label.act, context);
  if (rows.length === 0) {
    // "Um ato sem linha aplicável tem valência 0 e nenhum efeito" (dialogue-acts §7.1).
    return { valence: 0, deltas: [], context };
  }
  const toneFree = TONE_FREE_ACTS.includes(label.act);
  const view = {
    bond: context.bond,
    romanticBoldness: effectiveTrait(reader.traits, reader.tendencies, "romanticBoldness"),
  };
  const modulation = toneModulation(toneFree ? "NEUTRAL" : tone, view, combinedValence(rows));
  const scaling = { unit: scene.unit, ...modulation };
  const deltas = [
    ...termDeltas(termsOf(rows), reader, author.id, scaling, scene.drives),
    ...plainDeltas(scene, modulation.extras, reader, author.id),
  ];
  return { valence: modulation.valence, deltas, context };
}

/** The row context of `reader` about `subject`; the answer only when the subject made the request. */
function contextFor(
  scene: ActScene,
  reader: CharacterState,
  subject: CharacterId,
  tone: ToneId,
): RowContext {
  return rowContext({
    ...scene,
    present: scene.characters.map((character) => character.id),
    reader,
    subject,
    tone,
    answer: scene.answer?.creditor === subject ? scene.answer.view : null,
  });
}

/** The deltas of `terms` in `who`, toward `toward`, with the unit of the act and no multiplier. */
export function plainDeltas(
  scene: ActScene,
  terms: readonly EffectTerm[],
  who: CharacterState,
  toward: CharacterId,
): StateDelta[] {
  return termDeltas(terms, who, toward, { unit: scene.unit, ...NEUTRAL_SCALING }, scene.drives);
}

function perceptionDelta(
  who: CharacterId,
  toward: CharacterId,
  value: Extract<StateDelta, { kind: "PERCEPTION" }>["value"],
  delta: number,
): StateDelta[] {
  // A delta of 0 is dropped by finalizeDeltas.
  return [{ kind: "PERCEPTION", who, toward, value, delta }];
}

/**
 * What a target feels (simulation-model §9 items 1 to 4, dialogue-acts §7.1):
 * the row read in its tone; the surprise of a strong act from someone resented
 * or loved (`surprise` +2); and its perception of the author: hostility
 * `+1000 × |valence|` at valence ≤ −1, interest `+500 × valence` at ≥ 1, threat
 * +2000 in a `THREATEN`.
 */
export function targetReading(scene: ActScene, target: CharacterState, tone: ToneId): Reading {
  const reading = readAct(scene, target, target.id, tone);
  const { valence, context } = reading;
  const surprised =
    (valence >= SURPRISE_VALENCE && context.bond.resentment >= SURPRISE_BOND) ||
    (valence <= -SURPRISE_VALENCE && context.bond.affection >= SURPRISE_BOND);
  const author = scene.author.id;
  const deltas = [
    ...reading.deltas,
    ...(surprised ? plainDeltas(scene, [emotion("surprise", 2)], target, author) : []),
    ...perceptionDelta(
      target.id,
      author,
      "perceivedHostility",
      TARGET_HOSTILITY * Math.max(0, -valence),
    ),
    ...perceptionDelta(
      target.id,
      author,
      "perceivedInterest",
      TARGET_INTEREST * Math.max(0, valence),
    ),
    ...perceptionDelta(
      target.id,
      author,
      "perceivedThreat",
      THREAT_PERCEIVED[scene.label.act] ?? 0,
    ),
  ];
  return { ...reading, deltas };
}

/** In a `TELL` of a fact, who the version told says the fact is bad for (dialogue-acts §4). */
function exposed(scene: ActScene): CharacterId[] {
  const { label, author } = scene;
  const { topic } = label;
  return scene.facts
    .filter((held) => label.act === "TELL" && "fact" in topic && held.id === topic.fact)
    .flatMap((fact) => {
      const tellerCopy = author.memories.find((copy) => copy.fact === fact.id);
      return badSubjects(fact, toldOffenders(label, fact, tellerCopy), topic.type);
    });
}

/**
 * What a `DIRECT` listener who is not a target feels (dialogue-acts §7.4): the
 * emotions of the row it reads about the first target, halved; a `TELL` of a
 * new fact, `curiosity` −1; an act of valence ≤ −2, `anger` +1 and `care` +2
 * for each target it loves (affection ≥ 6000) and hostility
 * `+500 × |valence|` toward the author; a `TELL` of a fact bad for Y,
 * `justice` −3 toward Y when it has justice toward Y.
 */
export function witnessReading(
  scene: ActScene,
  witness: CharacterState,
  tone: ToneId,
  targets: readonly CharacterId[],
): Reading {
  const author = scene.author.id;
  const subject = targets[0] ?? author;
  const reading = readAct(scene, witness, subject, tone);
  const hostile = targets.length > 0 && reading.valence <= HOSTILE_VALENCE;
  const loved = targets.filter(
    (target) => hostile && bondToward(witness.bonds, target).axes.affection >= LOVED,
  );
  const avenged = exposed(scene).filter(
    (person) => directedDeficit(witness.drives, "justice", person) > 0,
  );
  const deltas = [
    ...reading.deltas
      .filter((delta) => targets.length > 0 && delta.kind === "EMOTION")
      .map((delta) => ({ ...delta, delta: mulBp(delta.delta, WITNESS_SHARE) })),
    ...(reading.context.newFact
      ? plainDeltas(scene, [drive("curiosity", -1)], witness, author)
      : []),
    ...loved.flatMap((target) =>
      plainDeltas(scene, [emotion("anger", 1), drive("care", 2)], witness, target),
    ),
    ...avenged.flatMap((person) => plainDeltas(scene, [drive("justice", -3)], witness, person)),
    ...perceptionDelta(
      witness.id,
      author,
      "perceivedHostility",
      hostile ? WITNESS_HOSTILITY * -reading.valence : 0,
    ),
  ];
  return { ...reading, valence: targets.length === 0 ? 0 : reading.valence, deltas };
}

/**
 * Jealousy (dialogue-acts §7.4): whoever perceives (`DIRECT` or `SEEN`) an act
 * of valence ≥ 1 in `SEDUCTIVE` or `WARM` from the author to a target Y — by
 * the real tone — and has attraction ≥ 6000 for Y or the label `SPOUSE` or
 * `PARTNER` toward Y, feels `jealousy` +2 and `resentment` +1 (half unit)
 * toward the author.
 */
export function jealousyDeltas(
  scene: ActScene,
  perceivers: readonly CharacterState[],
  realValences: readonly { readonly id: CharacterId; readonly valence: number }[],
): StateDelta[] {
  if (!JEALOUS_TONES.includes(scene.label.tone)) {
    return [];
  }
  const courted = realValences.filter((entry) => entry.valence >= 1).map((entry) => entry.id);
  return perceivers.flatMap((perceiver) =>
    courted
      .filter((target) => target !== perceiver.id && jealousOf(perceiver, target))
      .flatMap(() =>
        plainDeltas(
          scene,
          [emotion("jealousy", 2), bond("resentment", 1)],
          perceiver,
          scene.author.id,
        ),
      ),
  );
}

function jealousOf(perceiver: CharacterState, target: CharacterId): boolean {
  const toward = bondToward(perceiver.bonds, target);
  return (
    toward.axes.attraction >= ATTRACTED ||
    toward.labels.some((label) => JEALOUS_LABELS.includes(label))
  );
}
