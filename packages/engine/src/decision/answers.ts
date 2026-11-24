/**
 * Answers first (simulation-model §10 item 1): a character who owes answers
 * chooses only among the possible answers of each pending obligation (with
 * `OBLIGATION_BONUS`) and `STAY_SILENT`. A request is answered by the reply its
 * band fixes (dialogue-acts §8.2); the band comes from `owedBands`.
 */
import type { ActLabel, Topic } from "../acts/label.ts";
import type { Obligation } from "../acts/obligations.ts";
import { fixedReply } from "../acts/requests.ts";
import type { CharacterState } from "../character/state.ts";
import type { ActId } from "../presets/acts.ts";
import { makeLabel, NOBODY, rankTones, toOne, withLie, type TargetOption } from "./build.ts";
import { distanceTo, needsShout, presentOther, type DecisionScene } from "./scene.ts";
import { itemAt } from "../domain/lookup.ts";
import { acceptsTopic, offenceBy } from "./topics.ts";
import type { Candidate } from "./utility.ts";

/** How one obligation is answered: the labels, given the creditor's option. */
type AnswerRule = (scene: DecisionScene, owed: Obligation, option: TargetOption) => ActLabel[];

/** The labels of `act` about `topic` in its 3 tones of highest bias. */
function inTones(
  scene: DecisionScene,
  act: ActId,
  option: TargetOption,
  topic: Topic,
  isFalse = false,
): ActLabel[] {
  return rankTones(scene, act, option).map((tone) =>
    makeLabel(scene, act, option, { tone, topic, isFalse }),
  );
}

/** A whispered secret needs every target at 1 cell (dialogue-acts §9.1). */
function canTell(scene: DecisionScene, option: TargetOption, topic: Topic): boolean {
  const whispered =
    topic.type !== "SECRET" || option.listeners.every((each) => distanceTo(scene, each) <= 1);
  return acceptsTopic(scene, "TELL", topic) && whispered;
}

const toAsk: AnswerRule = (scene, owed, option) => [
  ...(canTell(scene, option, owed.topic) ? inTones(scene, "TELL", option, owed.topic) : []),
  ...inTones(scene, "REFUSE", option, owed.topic),
];

/** Whether the accusation owed is true: the fact has the debtor as an offender (dialogue-acts §4). */
function accusedRightly(scene: DecisionScene, owed: Obligation): boolean {
  const { topic } = owed;
  const fact = "fact" in topic ? scene.facts.find((held) => held.id === topic.fact) : undefined;
  return fact?.offenders.includes(owed.debtor) ?? false;
}

const toAccusation: AnswerRule = (scene, owed, option) => {
  const { topic } = owed;
  const admitted: Topic[] = "fact" in topic ? [{ type: "EVENT", fact: topic.fact }] : [];
  const back = option.target === null ? null : offenceBy(scene, option.target.id);
  return [
    ...admitted.flatMap((event) => inTones(scene, "APOLOGIZE", option, event)),
    ...inTones(scene, "REFUSE", option, topic, accusedRightly(scene, owed)),
    ...(back === null ? [] : inTones(scene, "ACCUSE", option, { type: "EVENT", fact: back.id })),
  ];
};

const toRequest: AnswerRule = (scene, owed, option) => {
  const drawn = scene.bands.find((band) => band.fact === owed.fact && band.debtor === owed.debtor);
  if (drawn === undefined) {
    throw new RangeError(
      `the band of the request ${owed.fact} was not drawn: call owedBands first`,
    );
  }
  const reply = fixedReply(drawn.band);
  const tone = itemAt(rankTones(scene, reply.act, option, 1, reply.tones), 0);
  return [
    makeLabel(scene, reply.act, option, { tone, topic: owed.topic, intensity: reply.intensity }),
  ];
};

/** The possible answers of each act that creates an obligation (simulation-model §10, table). */
const ANSWER_RULES: Readonly<Partial<Record<ActId, AnswerRule>>> = {
  ASK: toAsk,
  ACCUSE: toAccusation,
  REQUEST: toRequest,
  OFFER: toRequest,
  APOLOGIZE: toRequest,
  THREATEN: toRequest,
};

/** The single `STAY_SILENT` candidate: to nobody, in its tone of highest bias. */
export function silence(scene: DecisionScene): Candidate {
  const tone = itemAt(rankTones(scene, "STAY_SILENT", NOBODY, 1), 0);
  return {
    label: makeLabel(scene, "STAY_SILENT", NOBODY, { tone, topic: { type: "NONE" } }),
    answers: false,
  };
}

function answersTo(scene: DecisionScene, owed: Obligation): Candidate[] {
  const creditor: CharacterState | undefined = presentOther(scene, owed.creditor);
  const shouted = creditor === undefined ? null : needsShout(scene, creditor);
  const rule = ANSWER_RULES[owed.act];
  if (creditor === undefined || shouted === null || rule === undefined) {
    return [];
  }
  return rule(scene, owed, toOne(creditor, shouted)).flatMap((label) =>
    withLie(scene, label, true),
  );
}

/**
 * The candidates of an author who owes answers (simulation-model §10 item 1),
 * or `null` when it owes none: the answers of each pending obligation, in fact
 * order, with the creditor present and in reach, then `STAY_SILENT`.
 *
 * @throws RangeError if a request owed has no band drawn (see `owedBands`).
 */
export function answerCandidates(scene: DecisionScene): Candidate[] | null {
  const owed = scene.obligations
    .filter((obligation) => obligation.debtor === scene.author.id)
    .sort((a, b) => a.fact - b.fact);
  if (owed.length === 0) {
    return null;
  }
  return [...owed.flatMap((obligation) => answersTo(scene, obligation)), silence(scene)];
}
