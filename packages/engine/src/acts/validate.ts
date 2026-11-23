/**
 * Validation of an act label (dialogue-acts §1, §2 and §4; simulation-model
 * §16 sub-step 5.1): the values in range, the fields that belong to the act,
 * targets present and in reach, topics the act accepts and their references.
 * A label from outside (the player, the SOM) becomes an act only through here;
 * an invalid one comes back as a typed error the site shows as "ato inválido: …".
 *
 * The checks run in a fixed order and the first problem found is the answer.
 */
import type { CharacterState } from "../character/state.ts";
import { BP_MAX, type Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { err, ok, type Result } from "../domain/result.ts";
import type { FactCopy } from "../memory/copy.ts";
import type { Fact } from "../memory/fact.ts";
import type { ActId } from "../presets/acts.ts";
import { cellDistance, isPassable, type Grid } from "../space/grid.ts";
import { earshot } from "../space/hearing.ts";
import type { ActLabel, Topic } from "./label.ts";
import { answeredObligation, type Obligation } from "./obligations.ts";
import { actEntry, type ActRules } from "./rules.ts";

/** The codes of an invalid act, in the order the checks run. */
export const ACT_ERROR_CODES = [
  "BAD_INTENSITY",
  "BLAME_WITHOUT_LIE",
  "OBJECT_REQUIRED",
  "OBJECT_NOT_ALLOWED",
  "DESTINATION_REQUIRED",
  "DESTINATION_NOT_ALLOWED",
  "BAD_DESTINATION",
  "NO_TARGET_ALLOWED",
  "GROUP_NOT_ALLOWED",
  "ONE_TARGET_REQUIRED",
  "TARGET_REQUIRED",
  "TARGETS_NOT_SORTED",
  "SELF_TARGET",
  "TARGET_ABSENT",
  "TARGET_OUT_OF_EARSHOT",
  "TARGET_TOO_FAR",
  "TOPIC_NOT_ACCEPTED",
  "FACT_NOT_FOUND",
  "NOT_A_SECRET",
  "FACT_UNKNOWN",
  "NOT_THE_OFFENDER",
  "PERSON_NOT_TARGET",
  "NOTHING_TO_ANSWER",
] as const;

/** Why an act is invalid. */
export type ActErrorCode = (typeof ACT_ERROR_CODES)[number];

/** An invalid act: the code and, when the problem is one target, that target. */
export interface ActError {
  readonly code: ActErrorCode;
  readonly target: CharacterId | null;
}

/** What validation reads besides the label. */
export interface ActContext {
  readonly rules: ActRules;
  readonly grid: Grid;
  /** Noise of the place plus the weather (simulation-model §6). */
  readonly noise: Bp;
  readonly author: CharacterState;
  /** The others present (the author excluded). */
  readonly others: readonly CharacterState[];
  /** The record of facts. */
  readonly facts: readonly Fact[];
  /** The obligations pending in the scene. */
  readonly obligations: readonly Obligation[];
}

/** The readable message of each code, for "ato inválido: …". */
const MESSAGES: Readonly<Record<ActErrorCode, string>> = {
  BAD_INTENSITY: "a intensidade deve ser um inteiro de 0 a 10000",
  BLAME_WITHOUT_LIE: "só uma mentira culpa alguém",
  OBJECT_REQUIRED: "pedir ou oferecer exige um objeto",
  OBJECT_NOT_ALLOWED: "só pedir e oferecer levam objeto",
  DESTINATION_REQUIRED: "ir até uma célula exige o destino",
  DESTINATION_NOT_ALLOWED: "só ir até uma célula leva destino",
  BAD_DESTINATION: "o destino não é uma célula atravessável da grade",
  NO_TARGET_ALLOWED: "este ato não tem alvo",
  GROUP_NOT_ALLOWED: "este ato não se dirige ao grupo",
  ONE_TARGET_REQUIRED: "este ato exige exatamente um alvo",
  TARGET_REQUIRED: "este ato exige um alvo",
  TARGETS_NOT_SORTED: "os alvos devem vir em ordem crescente, sem repetição",
  SELF_TARGET: "ninguém é alvo do próprio ato",
  TARGET_ABSENT: "o alvo não está na cena",
  TARGET_OUT_OF_EARSHOT: "o alvo não ouviria o ato",
  TARGET_TOO_FAR: "o contato físico exige o alvo a 1 célula",
  TOPIC_NOT_ACCEPTED: "este ato não aceita este tipo de tópico",
  FACT_NOT_FOUND: "o fato do tópico não existe",
  NOT_A_SECRET: "o fato do tópico não é um segredo",
  FACT_UNKNOWN: "o autor não conhece o fato que conta ou de que acusa",
  NOT_THE_OFFENDER: "o alvo não é o ofensor do fato, segundo o autor",
  PERSON_NOT_TARGET: "a pessoa do tópico deve ser o alvo",
  NOTHING_TO_ANSWER: "não há pergunta, acusação ou pedido pendente a que isto responda",
};

/** Acts that carry an object, and the one that carries a destination (dialogue-acts §1). */
const OBJECT_ACTS: readonly ActId[] = ["REQUEST", "OFFER"];
const DESTINATION_ACTS: readonly ActId[] = ["MOVE"];
/** Acts whose `PERSON` topic is the target (dialogue-acts §4, "(o alvo)"). */
const PERSON_IS_TARGET: readonly ActId[] = [
  "GREET",
  "FAREWELL",
  "REQUEST",
  "OFFER",
  "APOLOGIZE",
  "THREATEN",
];

/** Which targets an act takes: any (speech acts), none, exactly one, or at least one. */
type TargetRule = "ANY" | "NONE" | "ONE" | "SOME";

/** The target rule of the acts without speech (dialogue-acts §2.2); speech acts take any. */
const TARGET_RULES: Readonly<Partial<Record<ActId, TargetRule>>> = {
  STAY_SILENT: "NONE",
  MOVE: "NONE",
  LEAVE: "NONE",
  APPROACH: "ONE",
  WITHDRAW: "ONE",
  TOUCH: "SOME",
};

/** Acts that need their targets within a distance, in cells (dialogue-acts §2.2: `TOUCH` at 1). */
const MAX_DISTANCE: Readonly<Partial<Record<ActId, number>>> = { TOUCH: 1 };

type Problem = ActError | null;
type Check = (label: ActLabel, context: ActContext) => Problem;

function problem(code: ActErrorCode, target: CharacterId | null = null): ActError {
  return { code, target };
}

function checkValues(label: ActLabel): Problem {
  const { intensity } = label;
  if (!Number.isSafeInteger(intensity) || intensity < 0 || intensity > BP_MAX) {
    return problem("BAD_INTENSITY");
  }
  return label.blamed !== undefined && !label.isFalse ? problem("BLAME_WITHOUT_LIE") : null;
}

/** `REQUIRED` when the act needs the field and lacks it; `NOT_ALLOWED` when it has it without needing it. */
function fieldProblem(needs: boolean, has: boolean): "REQUIRED" | "NOT_ALLOWED" | null {
  if (needs === has) {
    return null;
  }
  return needs ? "REQUIRED" : "NOT_ALLOWED";
}

function checkFields(label: ActLabel): Problem {
  const object = fieldProblem(OBJECT_ACTS.includes(label.act), label.object !== undefined);
  if (object !== null) {
    return problem(`OBJECT_${object}`);
  }
  const needs = DESTINATION_ACTS.includes(label.act);
  const destination = fieldProblem(needs, label.destination !== undefined);
  return destination === null ? null : problem(`DESTINATION_${destination}`);
}

function checkDestination(label: ActLabel, { grid }: ActContext): Problem {
  const { destination } = label;
  if (destination === undefined) {
    return null;
  }
  const type = Number.isSafeInteger(destination) ? grid.cells[destination] : undefined;
  return type !== undefined && isPassable(type) ? null : problem("BAD_DESTINATION");
}

function targetCountProblem(rule: TargetRule, count: number): Problem {
  const wrong: Readonly<Record<TargetRule, ActErrorCode | null>> = {
    ANY: null,
    NONE: count > 0 ? "NO_TARGET_ALLOWED" : null,
    ONE: count === 1 ? null : "ONE_TARGET_REQUIRED",
    SOME: count > 0 ? null : "TARGET_REQUIRED",
  };
  const code = wrong[rule];
  return code === null ? null : problem(code);
}

function checkTargetShape(label: ActLabel): Problem {
  const rule = TARGET_RULES[label.act] ?? "ANY";
  if (label.targets !== "GROUP") {
    return targetCountProblem(rule, label.targets.length);
  }
  const groupRule: Readonly<Record<TargetRule, ActErrorCode | null>> = {
    ANY: null,
    NONE: "NO_TARGET_ALLOWED",
    ONE: "GROUP_NOT_ALLOWED",
    SOME: "GROUP_NOT_ALLOWED",
  };
  const code = groupRule[rule];
  return code === null ? null : problem(code);
}

/** The target list (empty for `GROUP`). */
function listedTargets(label: ActLabel): readonly CharacterId[] {
  return label.targets === "GROUP" ? [] : label.targets;
}

function present(context: ActContext, id: CharacterId): CharacterState | undefined {
  return context.others.find((other) => other.id === id);
}

function checkTargetList(label: ActLabel, context: ActContext): Problem {
  const targets = listedTargets(label);
  if (targets.some((id, index) => index > 0 && id <= (targets[index - 1] ?? id))) {
    return problem("TARGETS_NOT_SORTED");
  }
  const self = targets.find((id) => id === context.author.id);
  if (self !== undefined) {
    return problem("SELF_TARGET", self);
  }
  const absent = targets.find((id) => present(context, id) === undefined);
  return absent === undefined ? null : problem("TARGET_ABSENT", absent);
}

/** Whether a present target is out of reach: beyond the act's distance, or out of earshot for speech. */
function reachProblem(label: ActLabel, context: ActContext, target: CharacterState): Problem {
  const { grid, author } = context;
  const limit = MAX_DISTANCE[label.act];
  if (limit !== undefined) {
    const far = cellDistance(grid, author.cell, target.cell) > limit;
    return far ? problem("TARGET_TOO_FAR", target.id) : null;
  }
  const speech = actEntry(context.rules, label.act).speech;
  const voice = { volume: label.volume, noise: context.noise };
  const heard = !speech || earshot(grid, voice, author.cell, target.cell) === "DIRECT";
  return heard ? null : problem("TARGET_OUT_OF_EARSHOT", target.id);
}

function checkReach(label: ActLabel, context: ActContext): Problem {
  for (const id of listedTargets(label)) {
    const target = present(context, id);
    const found = target === undefined ? null : reachProblem(label, context, target);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function checkTopicType(label: ActLabel, context: ActContext): Problem {
  const accepted = actEntry(context.rules, label.act).topics;
  const fits = accepted === "ANSWERED" || accepted.includes(label.topic.type);
  return fits ? null : problem("TOPIC_NOT_ACCEPTED");
}

function copyOf(author: CharacterState, fact: Fact): FactCopy | undefined {
  return author.memories.find((copy) => copy.fact === fact.id);
}

/** The offenders by the author's copy: the false version when there is one (dialogue-acts §4). */
function offendersByAuthor(copy: FactCopy, fact: Fact): readonly CharacterId[] {
  return copy.falseOffenders ?? fact.offenders;
}

/** The checks of a topic about a fact: it exists, a `SECRET` is secret, `TELL` and `ACCUSE` need a copy. */
function factProblem(
  label: ActLabel,
  context: ActContext,
  topic: Topic & { fact: unknown },
): Problem {
  const fact = context.facts.find((held) => held.id === topic.fact);
  if (fact === undefined) {
    return problem("FACT_NOT_FOUND");
  }
  if (topic.type === "SECRET" && !fact.secret) {
    return problem("NOT_A_SECRET");
  }
  if (label.act !== "TELL" && label.act !== "ACCUSE") {
    return null;
  }
  const copy = copyOf(context.author, fact);
  if (copy === undefined) {
    return problem("FACT_UNKNOWN");
  }
  const offenders = offendersByAuthor(copy, fact);
  const innocent =
    label.act === "ACCUSE" ? listedTargets(label).find((id) => !offenders.includes(id)) : undefined;
  return innocent === undefined ? null : problem("NOT_THE_OFFENDER", innocent);
}

/** A `PERSON` topic of an act about its target names a target (with `GROUP`, someone present). */
function personProblem(label: ActLabel, context: ActContext, person: CharacterId): Problem {
  if (!PERSON_IS_TARGET.includes(label.act)) {
    return null;
  }
  const addressed =
    label.targets === "GROUP"
      ? present(context, person) !== undefined
      : label.targets.includes(person);
  return addressed ? null : problem("PERSON_NOT_TARGET");
}

function checkTopicReference(label: ActLabel, context: ActContext): Problem {
  const { topic } = label;
  if ("fact" in topic) {
    return factProblem(label, context, topic);
  }
  return topic.type === "PERSON" ? personProblem(label, context, topic.person) : null;
}

/** `ACCEPT` and `REFUSE` answer a pending obligation of the author (dialogue-acts §4, "ato respondido"). */
function checkAnswer(label: ActLabel, context: ActContext): Problem {
  if (actEntry(context.rules, label.act).topics !== "ANSWERED") {
    return null;
  }
  const owed = answeredObligation(context.obligations, context.author.id, label);
  return owed === undefined ? problem("NOTHING_TO_ANSWER") : null;
}

/** The checks, in order. */
const CHECKS: readonly Check[] = [
  checkValues,
  checkFields,
  checkDestination,
  checkTargetShape,
  checkTargetList,
  checkReach,
  checkTopicType,
  checkTopicReference,
  checkAnswer,
];

/**
 * Validates an act of `context.author` (dialogue-acts §1, §2 and §4). In order:
 * intensity in `0..10000` and `blamed` only in a lie; `object` only and always
 * in `REQUEST` and `OFFER`, `destination` only and always in `MOVE`, on a
 * passable cell; the targets the act takes (`[]` and `GROUP` for speech acts;
 * none for `STAY_SILENT`, `MOVE` and `LEAVE`; one for `APPROACH` and `WITHDRAW`;
 * one or more for `TOUCH`), sorted, without the author, present and in reach
 * (`DIRECT` earshot at the act's volume for speech acts, 1 cell for `TOUCH`);
 * a topic type the act accepts, a fact that exists (a `SECRET` that is secret),
 * a copy of it for `TELL` and `ACCUSE`, the target as offender of an `ACCUSE`
 * by the author's copy, the target as the `PERSON` of acts about the target;
 * and, for `ACCEPT` and `REFUSE`, a pending obligation they answer.
 *
 * @returns the label, or the first problem found.
 */
export function validateAct(label: ActLabel, context: ActContext): Result<ActLabel, ActError> {
  for (const check of CHECKS) {
    const found = check(label, context);
    if (found !== null) {
      return err(found);
    }
  }
  return ok(label);
}

/**
 * The message the site shows for an invalid act.
 *
 * @example
 * describeActError({ code: "TARGET_ABSENT", target: 9 });
 * // "ato inválido: o alvo não está na cena (personagem 9)"
 */
export function describeActError(error: ActError): string {
  const who = error.target === null ? "" : ` (personagem ${error.target})`;
  return `ato inválido: ${MESSAGES[error.code]}${who}`;
}
