/**
 * Closed validation of the SOM answers (ai-integration §4.2): the answers come
 * in the neutral form of the port (the `score` already on the 2..10 ruler) and
 * are checked against the questions that were asked. Anything off — an answer
 * missing or not asked for, the wrong type, an option that does not exist, a
 * number that is not finite or out of range, a distribution that does not sum
 * to 1 (tolerance 0.02) — is a failure, and a failure never becomes an act.
 */
import { BP_MAX, err, ok, type Bp, type Result } from "@ai-fantasy/engine";
import { z } from "zod";

import { noulIsYes, probabilityToBp, scoreToIntensity, SCORE_MAX, SCORE_MIN } from "./convert.ts";
import type { Question } from "./prompts/questions.ts";

/**
 * How far above 1 the sum of a distribution may be, in bp (0.02; ai-integration
 * §4.2). The sum is rounded to bp before comparing, so the edge does not depend
 * on floating-point noise. A sum below 1 is fine: the route may list only part
 * of the options, and the missing mass belongs to the options not listed.
 */
export const DISTRIBUTION_TOLERANCE_BP = 200;

/** The levels of the score ruler as distribution keys: `"2"` to `"10"`. */
const SCORE_KEYS = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => `${SCORE_MIN + i}`);

const unit = z.number().min(0).max(1);
const distribution = z.record(z.string(), unit);

const answerSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("noul"), noul: unit }),
  z.strictObject({
    type: z.literal("choice"),
    choice: z.string(),
    probabilities: distribution.optional(),
    confidence: unit.optional(),
  }),
  z.strictObject({
    type: z.literal("score"),
    score: z.number().min(SCORE_MIN).max(SCORE_MAX),
    probabilities: distribution.optional(),
    confidence: unit.optional(),
  }),
]);

type RawAnswer = z.output<typeof answerSchema>;
type RawRanked = Exclude<RawAnswer, { type: "noul" }>;

/** A validated answer, converted to bp. */
export type ReadAnswer =
  | { readonly type: "noul"; readonly probability: Bp; readonly yes: boolean }
  | {
      readonly type: "choice";
      readonly choice: string;
      /** The distribution in bp, as the model gave it (empty when it gave none). */
      readonly probabilities: Readonly<Record<string, Bp>>;
      /** The highest probability; the confidence when there is no distribution; else 0. */
      readonly top: Bp;
    }
  | { readonly type: "score"; readonly score: number; readonly intensity: Bp; readonly top: Bp };

/** The validated answers, by question id. */
export type ReadAnswers = Readonly<Record<string, ReadAnswer>>;

/** Why the answers were refused. */
export type AnswerErrorCode =
  | "NOT_AN_OBJECT"
  | "MISSING_ANSWER"
  | "UNEXPECTED_ANSWER"
  | "INVALID_ANSWER"
  | "WRONG_TYPE"
  | "UNKNOWN_OPTION"
  | "INCOHERENT_DISTRIBUTION";

/** The first problem found, with the question it is about (`null` for the whole reply). */
export interface AnswerError {
  readonly code: AnswerErrorCode;
  readonly question: string | null;
}

function optionsOf(question: Question): readonly string[] {
  return question.type === "choice" ? Object.keys(question.criteria) : SCORE_KEYS;
}

function distributionProblem(
  answer: RawRanked,
  options: readonly string[],
): AnswerErrorCode | undefined {
  const keys = Object.keys(answer.probabilities ?? {});
  const known = keys.every((key) => options.includes(key));
  if (!known || (answer.type === "choice" && !options.includes(answer.choice))) {
    return "UNKNOWN_OPTION";
  }
  return answer.probabilities === undefined || coherent(answer, answer.probabilities)
    ? undefined
    : "INCOHERENT_DISTRIBUTION";
}

/**
 * A listed distribution is coherent when its sum is above 0 and at most
 * 1.02, and, in a `choice`, the option chosen has the highest probability
 * listed (ties allowed). A `score` is a weighted mean, not a level, so only the
 * sum applies to it.
 */
function coherent(answer: RawRanked, probabilities: Readonly<Record<string, number>>): boolean {
  const values = Object.values(probabilities);
  const sumBp = Math.round(values.reduce((total, p) => total + p, 0) * BP_MAX);
  if (sumBp <= 0 || sumBp > BP_MAX + DISTRIBUTION_TOLERANCE_BP) {
    return false;
  }
  const chosen = answer.type === "choice" ? probabilities[answer.choice] : undefined;
  return answer.type === "score" || (chosen !== undefined && chosen >= Math.max(...values));
}

function top(answer: RawRanked): Bp {
  const values = Object.values(answer.probabilities ?? {});
  const best = values.length > 0 ? Math.max(...values) : (answer.confidence ?? 0);
  return probabilityToBp(best);
}

function convert(answer: RawAnswer): ReadAnswer {
  if (answer.type === "noul") {
    return { type: "noul", probability: probabilityToBp(answer.noul), yes: noulIsYes(answer.noul) };
  }
  if (answer.type === "score") {
    const intensity = scoreToIntensity(answer.score);
    return { type: "score", score: answer.score, intensity, top: top(answer) };
  }
  const entries = Object.entries(answer.probabilities ?? {});
  const probabilities = Object.fromEntries(entries.map(([key, p]) => [key, probabilityToBp(p)]));
  return { type: "choice", choice: answer.choice, probabilities, top: top(answer) };
}

function readOne(question: Question, raw: unknown): Result<ReadAnswer, AnswerErrorCode> {
  if (raw === undefined) {
    return err("MISSING_ANSWER");
  }
  const parsed = answerSchema.safeParse(raw);
  if (!parsed.success) {
    return err("INVALID_ANSWER");
  }
  const answer = parsed.data;
  if (answer.type !== question.type) {
    return err("WRONG_TYPE");
  }
  const problem =
    answer.type === "noul" ? undefined : distributionProblem(answer, optionsOf(question));
  return problem === undefined ? ok(convert(answer)) : err(problem);
}

const repliesSchema = z.record(z.string(), z.unknown());

/**
 * Validates the answers to `questions` and converts them to bp.
 *
 * @returns the answers by question id, or the first problem found.
 */
export function validateAnswers(
  questions: Readonly<Record<string, Question>>,
  raw: unknown,
): Result<ReadAnswers, AnswerError> {
  const replies = repliesSchema.safeParse(raw);
  if (!replies.success) {
    return err({ code: "NOT_AN_OBJECT", question: null });
  }
  const unexpected = Object.keys(replies.data).find((id) => !Object.hasOwn(questions, id));
  if (unexpected !== undefined) {
    return err({ code: "UNEXPECTED_ANSWER", question: unexpected });
  }
  const read: Record<string, ReadAnswer> = {};
  for (const [id, question] of Object.entries(questions)) {
    const answer = readOne(question, replies.data[id]);
    if (!answer.ok) {
      return err({ code: answer.error, question: id });
    }
    read[id] = answer.value;
  }
  return ok(read);
}
