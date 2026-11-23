/**
 * The consequences of an act (simulation-model §9, §16 sub-step 5.3;
 * dialogue-acts §5, §7 and §8.3): from the real act, the reading of each
 * listener and the state before the act, the deltas of every character, the
 * appraisal the record takes (offenders, importances, believers of a lie, the
 * band of an answer) and the outcome of a lie. Pure: it applies the deltas to
 * copies; the draws of a lie go to the drawer of the tick.
 *
 * In the scene step (SOC-05) it runs between `readTone` and `recordAct`:
 * `resolveAct` documents the composition.
 */
import type { CharacterState } from "../character/state.ts";
import { toBp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { div } from "../domain/math.ts";
import type { Fact } from "../memory/fact.ts";
import type { RecordAppraisal } from "../memory/record.ts";
import type { Drawer } from "../rng/drawer.ts";
import { effectUnit } from "./appraisal-effects.ts";
import { authorDeltas, ignoringDeltas, interruptionDeltas } from "./appraisal-actor.ts";
import {
  jealousyDeltas,
  readAct,
  targetReading,
  witnessReading,
  type ActScene,
} from "./appraisal-readers.ts";
import { applyDeltas, finalizeDeltas, importancesOf, type StateDelta } from "./deltas.ts";
import type { AnswerView } from "./effect-terms.ts";
import type { ActLabel, OutcomeBand } from "./label.ts";
import {
  DISCOVERED_LIE_IMPORTANCE,
  drawLieOutcomes,
  factLie,
  lieOutcomeDeltas,
  type LieOutcome,
} from "./lies.ts";
import {
  answeredObligation,
  isInterruption,
  settleObligations,
  type Obligation,
} from "./obligations.ts";
import { isRequestAct, requestDrives, type RequestObjectRules } from "./request-answers.ts";
import { bandOfAnswer } from "./requests.ts";
import type { ListenerView } from "./resolve.ts";

export { ignoringDeltas } from "./appraisal-actor.ts";

/** An act to appraise: the real act, its listeners and the state before it. */
export interface AppraisalInput {
  readonly objects: RequestObjectRules;
  readonly author: CharacterId;
  /** The real label of a valid act. */
  readonly label: ActLabel;
  /** Who perceived the act, with each `DIRECT` listener's reading (see `resolveAct`). */
  readonly listeners: readonly ListenerView[];
  /** Everyone present, the author included, before the act. */
  readonly characters: readonly CharacterState[];
  /** The record before the act. */
  readonly facts: readonly Fact[];
  /** The obligations pending before the act. */
  readonly obligations: readonly Obligation[];
  /**
   * The band drawn for a target in `AUTO` that answers a request (see
   * `resolveRequestTurn`); without it, the band comes from the answer itself
   * (`bandOfAnswer`, the player in `MANUAL`).
   */
  readonly band?: OutcomeBand | undefined;
}

/** The valence of the act for one who appraised it, as it read the tone. */
export interface Valence {
  readonly id: CharacterId;
  readonly valence: number;
}

/** The consequences of an act. */
export interface Appraisal {
  /** Every change, finished (see `finalizeDeltas`). */
  readonly deltas: readonly StateDelta[];
  /** The characters with the deltas applied (the copies come with `recordAct`). */
  readonly characters: readonly CharacterState[];
  /** What `recordAct` takes. */
  readonly record: RecordAppraisal;
  /** The valence for each target and witness, in increasing id order. */
  readonly valences: readonly Valence[];
  /** How each `DIRECT` hearer came out of a lie about a fact, in id order. */
  readonly lies: readonly LieOutcome[];
}

const OFFENSIVE_VALENCE = -1;

function stateOf(input: AppraisalInput, id: CharacterId): CharacterState {
  const found = input.characters.find((character) => character.id === id);
  if (found === undefined) {
    throw new RangeError(`the character ${id} is not present`);
  }
  return found;
}

/** The answer the act gives, with its band (dialogue-acts §8.2), when it answers an obligation. */
function answerOf(input: AppraisalInput, answered: Obligation | undefined): ActScene["answer"] {
  if (answered === undefined) {
    return null;
  }
  const request = input.facts.find((fact) => fact.id === answered.fact);
  const object = request?.kind === "ACT" ? (request.label.object ?? null) : null;
  const band = isRequestAct(answered.act) ? (input.band ?? bandOfAnswer(input.label)) : null;
  const view: AnswerView = { act: answered.act, band, object };
  return { view, creditor: answered.creditor };
}

/** The debtors of the last act's obligations, when the author interrupts (simulation-model §11). */
function interrupted(input: AppraisalInput): CharacterState[] {
  if (!isInterruption(input.obligations, input.facts, input.author)) {
    return [];
  }
  const last = input.facts.findLast((fact) => fact.kind === "ACT");
  return input.obligations
    .filter((owed) => owed.fact === last?.id)
    .map((owed) => stateOf(input, owed.debtor));
}

function sceneOf(input: AppraisalInput, answered: Obligation | undefined, lies: LieInfo): ActScene {
  const answer = answerOf(input, answered);
  const unit = effectUnit(input.label.intensity);
  return {
    author: stateOf(input, input.author),
    label: input.label,
    facts: input.facts,
    characters: input.characters,
    unit: answer?.view.band === "PARTIAL" ? div(unit, 2) : unit,
    drives: requestDrives(answer?.view ?? null, input.objects),
    answer,
    believers: lies.believers,
  };
}

interface LieInfo {
  readonly outcomes: LieOutcome[];
  readonly believers: CharacterId[] | null;
}

function settleLie(
  drawer: Drawer,
  input: AppraisalInput,
  answered: Obligation | undefined,
  direct: readonly CharacterState[],
): LieInfo {
  const fact = factLie(input.label, answered?.act ?? null);
  if (fact === null) {
    return { outcomes: [], believers: null };
  }
  const author = stateOf(input, input.author);
  const outcomes = drawLieOutcomes(drawer, { author, fact, hearers: direct });
  const believers = outcomes
    .filter((entry) => entry.kind === "BELIEVED")
    .map((entry) => entry.listener);
  return { outcomes, believers };
}

/** Who the act is addressed to among the `DIRECT` listeners (dialogue-acts §1 and §7.1). */
function addresseesOf(label: ActLabel, direct: readonly CharacterState[]): CharacterId[] {
  const { targets } = label;
  return direct
    .map((listener) => listener.id)
    .filter((id) => targets === "GROUP" || targets.includes(id));
}

function readingsOf(scene: ActScene, input: AppraisalInput, direct: readonly ListenerView[]) {
  const addressees = addresseesOf(
    input.label,
    direct.map((view) => stateOf(input, view.id)),
  );
  const toneOf = (view: ListenerView) => view.reading?.tone ?? input.label.tone;
  const targets = direct
    .filter((view) => addressees.includes(view.id))
    .map((view) => ({
      id: view.id,
      ...targetReading(scene, stateOf(input, view.id), toneOf(view)),
    }));
  const witnesses = direct
    .filter((view) => !addressees.includes(view.id))
    .map((view) => ({
      id: view.id,
      ...witnessReading(scene, stateOf(input, view.id), toneOf(view), addressees),
    }));
  const real = addressees.map((id) => ({
    id,
    valence: readAct(scene, stateOf(input, id), id, input.label.tone).valence,
  }));
  return { addressees, targets, witnesses, real };
}

/** The importance of the new fact for the author and every one who perceived it (simulation-model §12). */
function importances(
  input: AppraisalInput,
  deltas: readonly StateDelta[],
  addressees: readonly CharacterId[],
  outcomes: readonly LieOutcome[],
) {
  const { topic } = input.label;
  const involved = [
    input.author,
    ...addressees,
    ...(topic.type === "PERSON" ? [topic.person] : []),
  ];
  const perceivers = input.listeners.map((view) => view.id).sort(compareIds);
  const detectors = outcomes
    .filter((entry) => entry.kind === "DETECTED")
    .map((entry) => entry.listener);
  return importancesOf(deltas, [input.author, ...perceivers], involved).map((entry) => ({
    ...entry,
    importance: toBp(
      entry.importance + (detectors.includes(entry.id) ? DISCOVERED_LIE_IMPORTANCE : 0),
    ),
  }));
}

/**
 * Appraises an act (simulation-model §9; dialogue-acts §5, §7, §8.3): the lie
 * about a fact is settled first (detection and belief, in id order; see
 * `drawLieOutcomes`); each `DIRECT` target takes the row of the act in the tone
 * it read (`targetReading`), each other `DIRECT` listener the witness rules
 * (`witnessReading`), and those who perceive a courtship of someone they love,
 * jealousy; then the author's own effects, the interruption, the obligations
 * the act ignored and the effects of the lie. The deltas are finished (equal
 * ones sum, bonds capped at ±1500 per axis) and applied.
 *
 * The record takes: the author as offender when the act, by its real tone, has
 * valence ≤ −1 for a target; the importance for the author and each one who
 * perceived it (+3000 for who detected a lie); the believers of a lie; and the
 * band of an answer to a request.
 *
 * @throws RangeError if the author or a listener is not among the characters.
 */
export function appraiseAct(drawer: Drawer, input: AppraisalInput): Appraisal {
  const answered = answeredObligation(input.obligations, input.author, input.label);
  const direct = input.listeners
    .filter((view) => view.perspective === "DIRECT")
    .sort((a, b) => compareIds(a.id, b.id));
  const lie = settleLie(
    drawer,
    input,
    answered,
    direct.map((view) => stateOf(input, view.id)),
  );
  const scene = sceneOf(input, answered, lie);
  const { addressees, targets, witnesses, real } = readingsOf(scene, input, direct);
  const readings = [...targets, ...witnesses];
  const deltas = finalizeDeltas([
    ...readings.flatMap((reading) => reading.deltas),
    ...jealousyDeltas(scene, perceiversOf(input), real),
    ...authorDeltas(scene, real),
    ...interruptionDeltas(scene, interrupted(input)),
    ...ignoringDeltas(input.characters, ignoredBy(input)),
    ...lieOutcomeDeltas(lie.outcomes, input.author),
  ]);
  const band = scene.answer?.view.band ?? null;
  return {
    deltas,
    characters: applyDeltas(input.characters, deltas),
    record: {
      offenders: real.some((entry) => entry.valence <= OFFENSIVE_VALENCE) ? [input.author] : [],
      importances: importances(input, deltas, addressees, lie.outcomes),
      ...(lie.believers === null ? {} : { believers: lie.believers }),
      ...(band === null ? {} : { band }),
    },
    valences: readings
      .map((reading) => ({ id: reading.id, valence: reading.valence }))
      .sort((a, b) => compareIds(a.id, b.id)),
    lies: lie.outcomes,
  };
}

/** Who perceived the act directly or saw it: who may feel jealous (dialogue-acts §7.4). */
function perceiversOf(input: AppraisalInput): CharacterState[] {
  return input.listeners
    .filter((view) => view.perspective === "DIRECT" || view.perspective === "SEEN")
    .map((view) => stateOf(input, view.id));
}

/** The obligations of the author the act ignores (simulation-model §10). */
function ignoredBy(input: AppraisalInput): Obligation[] {
  return settleObligations(input.obligations, input.author, input.label)
    .ended.filter((ended) => ended.ending === "IGNORED")
    .map((ended) => ended.obligation);
}
