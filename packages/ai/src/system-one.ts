/**
 * Reading a player line through the SOM port (overview §4): build the single
 * call, ask, validate closed and read the candidate act. Any failure — of the
 * port or of the answers — comes back as a value; the interface then offers
 * the act menu (ai-integration §4.2).
 */
import { err, ok, type Presets, type Result } from "@ai-fantasy/engine";

import { validateAnswers, type AnswerError } from "./answers.ts";
import type { AiFailure, CallUsage, SystemOnePort } from "./ports.ts";
import { buildPlayerLineCall, type PlayerLineInput } from "./prompts/player-line.ts";
import { readPlayerAnswers, type PlayerReading } from "./reading.ts";

/** Why a player line could not be read: the port failed, or its answers were refused. */
export type PlayerLineFailure =
  | AiFailure
  | { readonly kind: "INVALID_ANSWERS"; readonly error: AnswerError; readonly usage: CallUsage };

/** A player line read, with the usage of the call for the record. */
export interface PlayerLineResult {
  readonly reading: PlayerReading;
  readonly usage: CallUsage;
}

/** Reads a player line as a candidate act through `port`. */
export async function readPlayerLine(
  port: SystemOnePort,
  input: PlayerLineInput,
  presets: Presets,
): Promise<Result<PlayerLineResult, PlayerLineFailure>> {
  const call = buildPlayerLineCall(input, presets);
  const reply = await port.decide(call);
  if (!reply.ok) {
    return reply;
  }
  const { answers, usage } = reply.value;
  const validated = validateAnswers(call.questions, answers);
  if (!validated.ok) {
    return err({ kind: "INVALID_ANSWERS", error: validated.error, usage });
  }
  return ok({ reading: readPlayerAnswers(input, presets, validated.value), usage });
}
