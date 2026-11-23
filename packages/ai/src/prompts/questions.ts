/**
 * The SOM questions (ai-integration §4.1): a neutral form that mirrors the
 * decisions route, so the adapter (AI-02) sends it as it is. Three types:
 *
 * - `noul`: a yes-or-no question, with both rubrics or none;
 * - `choice`: one option among 2 to 255; the keys are the labels the model
 *   reads, and a rubric may be `null` when the label explains itself;
 * - `score`: the project ruler from 2 to 10, so exactly 9 levels, lowest first.
 *
 * At most 16 questions go in a call; question ids match `^[A-Za-z0-9_.-]{1,96}$`.
 */
import { err, ok, type Result } from "@ai-fantasy/engine";
import { z } from "zod";

/** Project rule: at most 16 questions per SOM call (ai-integration §4.1). */
export const MAX_QUESTIONS_PER_CALL = 16;

/** Most options a `choice` question takes (the route's limit). */
export const MAX_CHOICE_OPTIONS = 255;

/** Levels of the `score` ruler, from 2 to 10 (ai-integration §4.1). */
export const SCORE_LEVELS = 9;

/** Longest session id the route takes. */
export const MAX_SESSION_ID_LENGTH = 256;

/** Pattern of a question id. */
export const QUESTION_ID_PATTERN = /^[A-Za-z0-9_.-]{1,96}$/;

const instructionsSchema = z.string().min(1);

function between(count: number, low: number, high: number): boolean {
  return count >= low && count <= high;
}

const noulSchema = z.strictObject({
  type: z.literal("noul"),
  instructions: instructionsSchema,
  criteria: z.strictObject({ true: z.string().min(1), false: z.string().min(1) }).optional(),
});

const choiceSchema = z.strictObject({
  type: z.literal("choice"),
  instructions: instructionsSchema,
  criteria: z
    .record(z.string().min(1), z.string().min(1).nullable())
    .refine((options) => between(Object.keys(options).length, 2, MAX_CHOICE_OPTIONS)),
});

const scoreSchema = z.strictObject({
  type: z.literal("score"),
  instructions: instructionsSchema,
  criteria: z.array(z.string().min(1)).length(SCORE_LEVELS),
});

/** Schema of one question. */
export const questionSchema = z.discriminatedUnion("type", [noulSchema, choiceSchema, scoreSchema]);

/** One SOM question. */
export type Question = z.output<typeof questionSchema>;

/** A `choice` question. */
export type ChoiceQuestion = Extract<Question, { type: "choice" }>;

/** A JSON value: what the `state` of a call may hold. */
export type JsonValue = z.output<ReturnType<typeof z.json>>;

/** Schema of a call: the state, 1 to 16 questions by id and an optional session id. */
export const decisionCallSchema = z.strictObject({
  state: z.json(),
  questions: z
    .record(z.string().regex(QUESTION_ID_PATTERN), questionSchema)
    .refine((questions) => between(Object.keys(questions).length, 1, MAX_QUESTIONS_PER_CALL)),
  sessionId: z.string().min(1).max(MAX_SESSION_ID_LENGTH).optional(),
});

/** One call to the SOM: what the adapter sends (ai-integration §4.1). */
export interface DecisionCall {
  /** The compact context: the text as typed, who is present, the scene in words… */
  readonly state: JsonValue;
  /** The questions, by id, in the order they were built. */
  readonly questions: Readonly<Record<string, Question>>;
  /** The session the call belongs to, for the route's grouping. */
  readonly sessionId?: string | undefined;
}

/** A question with its id, in build order. */
export type QuestionEntry = readonly [id: string, question: Question];

/** Why a call is not well formed: the paths of the problems, joined by " | ". */
export interface CallError {
  readonly code: "INVALID_CALL";
  readonly path: string;
}

/**
 * Checks a call against the rules of the route and of the project.
 *
 * @returns the call, or `INVALID_CALL` with the paths of the problems, joined by " | ".
 */
export function checkDecisionCall(input: unknown): Result<DecisionCall, CallError> {
  const parsed = decisionCallSchema.safeParse(input);
  if (parsed.success) {
    return ok(parsed.data);
  }
  const path = parsed.error.issues.map((issue) => issue.path.join("."));
  return err({ code: "INVALID_CALL", path: path.join(" | ") });
}

/**
 * Splits questions into calls of at most {@link MAX_QUESTIONS_PER_CALL}, in order,
 * each with the same state.
 */
export function splitIntoCalls(
  state: JsonValue,
  questions: readonly QuestionEntry[],
): DecisionCall[] {
  const calls: DecisionCall[] = [];
  for (let start = 0; start < questions.length; start += MAX_QUESTIONS_PER_CALL) {
    const slice = questions.slice(start, start + MAX_QUESTIONS_PER_CALL);
    calls.push({ state, questions: Object.fromEntries(slice) });
  }
  return calls;
}
