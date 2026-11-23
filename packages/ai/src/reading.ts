/**
 * From the SOM answers to a candidate act (dialogue-acts §11). The answers were
 * already validated against the call built from the same input, so every
 * choice is one of the options offered. The engine still validates the
 * candidate against the scene (SOC-01); this module only applies the reading
 * rules:
 *
 * - `NOBODY` ⇒ `targets = []`; `GROUP` ⇒ `"GROUP"`;
 * - `MOVE` with one target ⇒ `APPROACH`; without one, a `DESTINATION` gap (the
 *   interface asks for the cell);
 * - `object` only in `REQUEST` and `OFFER`; `blamed` only with `isFalse`;
 * - acts without speech have topic `NONE`; `SMALL_TALK` needs no reference;
 *   any other type needs a `topicRef` of that type, else topic `NONE` and a
 *   `TOPIC` gap;
 * - confidence = the smaller of the top probabilities of `act` and `target`;
 *   below 7000 bp, with `OTHER` or with a gap, the player confirms (D-20).
 */
import {
  ACT_IDS,
  REQUEST_OBJECT_IDS,
  TONE_IDS,
  TOPIC_TYPE_IDS,
  VOLUMES,
  type ActId,
  type ActLabel,
  type ActTargets,
  type Bp,
  type CharacterId,
  type Presets,
  type Topic,
} from "@ai-fantasy/engine";

import type { ReadAnswer, ReadAnswers } from "./answers.ts";
import {
  byId,
  characterKey,
  entityKey,
  type Person,
  type PlayerLineInput,
} from "./prompts/player-line.ts";

/** Below this confidence the player confirms the reading (ai-integration §4.4, D-20). */
export const CONFIRMATION_THRESHOLD_BP = 7000;

/** Something the reading could not fill: the topic, or the cell of a `MOVE`. */
export type ReadingGap = "TOPIC" | "DESTINATION";

/** A player line read as an act. */
export interface PlayerReading {
  /** The act read, after `MOVE` with a target became `APPROACH`. */
  readonly act: ActId | "OTHER";
  /** The candidate act; `undefined` when the act read is `OTHER`. */
  readonly candidate: ActLabel | undefined;
  /** The smaller of the top probabilities of `act` and `target`. */
  readonly confidence: Bp;
  /** Whether the interface shows the "understood as" tag (ai-integration §4.4). */
  readonly needsConfirmation: boolean;
  readonly gaps: readonly ReadingGap[];
  /** The original reading, for the record. */
  readonly answers: ReadAnswers;
}

type AnswerType = ReadAnswer["type"];

function typed<T extends AnswerType>(
  answers: ReadAnswers,
  id: string,
  type: T,
): Extract<ReadAnswer, { type: T }> {
  const found = answers[id];
  if (found?.type !== type) {
    throw new Error(`the answer to ${id} is not a validated ${type}`);
  }
  // Narrowed by the check above: `found.type` is `T`.
  return found as Extract<ReadAnswer, { type: T }>;
}

function answer(answers: ReadAnswers, id: string): Extract<ReadAnswer, { type: "choice" }> {
  return typed(answers, id, "choice");
}

function pick<T extends string>(answers: ReadAnswers, id: string, options: readonly T[]): T {
  const choice = answer(answers, id).choice;
  const found = options.find((option) => option === choice);
  if (found === undefined) {
    throw new Error(`the answer to ${id} is not one of the options offered`);
  }
  return found;
}

function personByKey(people: readonly Person[], key: string): CharacterId | undefined {
  return byId(people).find(({ id }) => characterKey(id) === key)?.id;
}

function targetsOf(input: PlayerLineInput, key: string): ActTargets {
  const id = personByKey(input.listeners, key);
  if (id !== undefined) {
    return [id];
  }
  return key === "GROUP" ? "GROUP" : [];
}

function moveOrApproach(act: ActId, targets: ActTargets): ActId {
  return act === "MOVE" && Array.isArray(targets) && targets.length === 1 ? "APPROACH" : act;
}

function topicOf(input: PlayerLineInput, answers: ReadAnswers): Topic | undefined {
  const type = pick(answers, "topicType", TOPIC_TYPE_IDS);
  if (type === "SMALL_TALK") {
    return { type };
  }
  const ref = answer(answers, "topicRef").choice;
  const entity = input.entities.find((_, index) => entityKey(index) === ref);
  return entity?.topic.type === type ? entity.topic : undefined;
}

function extras(input: PlayerLineInput, act: ActId, answers: ReadAnswers): Partial<ActLabel> {
  const object = pick(answers, "object", [...REQUEST_OBJECT_IDS, "NONE"]);
  const isFalse = typed(answers, "isFalse", "noul").yes;
  const blamed = isFalse ? personByKey(input.people, answer(answers, "blamed").choice) : undefined;
  return {
    ...((act === "REQUEST" || act === "OFFER") && object !== "NONE" ? { object } : {}),
    ...(blamed === undefined ? {} : { blamed }),
  };
}

interface Candidate {
  readonly label: ActLabel;
  readonly gaps: ReadingGap[];
}

function candidateOf(
  input: PlayerLineInput,
  presets: Presets,
  read: ActId,
  answers: ReadAnswers,
): Candidate {
  const targets = targetsOf(input, answer(answers, "target").choice);
  const act = moveOrApproach(read, targets);
  const speech = presets.acts.some(({ id, speech }) => id === act && speech);
  const topic = speech ? topicOf(input, answers) : { type: "NONE" as const };
  const label: ActLabel = {
    act,
    tone: pick(answers, "tone", TONE_IDS),
    targets,
    topic: topic ?? { type: "NONE" },
    intensity: typed(answers, "intensity", "score").intensity,
    volume: pick(answers, "volume", VOLUMES),
    isFalse: typed(answers, "isFalse", "noul").yes,
    ...extras(input, act, answers),
  };
  const gaps: ReadingGap[] = [
    ...(topic === undefined ? (["TOPIC"] as const) : []),
    ...(act === "MOVE" ? (["DESTINATION"] as const) : []),
  ];
  return { label, gaps };
}

/**
 * Reads validated answers to the player-line call as a candidate act, with the
 * confidence of the reading and what is still missing.
 */
export function readPlayerAnswers(
  input: PlayerLineInput,
  presets: Presets,
  answers: ReadAnswers,
): PlayerReading {
  const read = pick(answers, "act", [...ACT_IDS, "OTHER"]);
  const confidence = Math.min(answer(answers, "act").top, answer(answers, "target").top) as Bp;
  const candidate = read === "OTHER" ? undefined : candidateOf(input, presets, read, answers);
  const gaps = candidate?.gaps ?? [];
  return {
    act: candidate?.label.act ?? "OTHER",
    candidate: candidate?.label,
    confidence,
    needsConfirmation:
      candidate === undefined || gaps.length > 0 || confidence < CONFIRMATION_THRESHOLD_BP,
    gaps,
    answers,
  };
}
