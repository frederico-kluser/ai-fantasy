/**
 * Deterministic fakes of the two ports (ai-integration §8, testing-strategy
 * §8): scripted answers, no network, no clock. Every unit, integration and E2E
 * test uses them; only `npm run smoke:live` talks to real models.
 */
import { err, ok } from "@ai-fantasy/engine";

import type { AiFailure, CallUsage, RenderRequest, SystemOnePort, TextModelPort } from "./ports.ts";
import type { DecisionCall, Question } from "./prompts/questions.ts";

/** The usage the fakes report: nothing spent, no time taken. */
export const FAKE_USAGE: CallUsage = {
  model: "fake",
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  latencyMs: 0,
};

/** How the fake SOM answers. */
export interface FakeSystemOneOptions {
  /** Answers by question id, in the neutral form; any other question gets the default. */
  readonly answers?: Readonly<Record<string, unknown>>;
  /** When set, every call fails with it. */
  readonly failure?: AiFailure;
}

/** The fake SOM, with the calls it received in order. */
export interface FakeSystemOne extends SystemOnePort {
  readonly calls: readonly DecisionCall[];
}

/**
 * The default answer: `noul` 0; the first option of a `choice`; level 2 of a
 * `score`; each with certainty.
 */
function defaultAnswer(question: Question): unknown {
  if (question.type === "noul") {
    return { type: "noul", noul: 0 };
  }
  if (question.type === "score") {
    return { type: "score", score: 2, probabilities: { "2": 1 }, confidence: 1 };
  }
  const [first = ""] = Object.keys(question.criteria);
  return { type: "choice", choice: first, probabilities: { [first]: 1 }, confidence: 1 };
}

/** A fake SOM: answers from the table, defaults for the rest, or always the failure. */
export function createFakeSystemOne(options: FakeSystemOneOptions = {}): FakeSystemOne {
  const calls: DecisionCall[] = [];
  const table = options.answers ?? {};
  return {
    calls,
    decide(call) {
      calls.push(call);
      if (options.failure !== undefined) {
        return Promise.resolve(err(options.failure));
      }
      const answers = Object.fromEntries(
        Object.entries(call.questions).map(([id, question]) => [
          id,
          Object.hasOwn(table, id) ? table[id] : defaultAnswer(question),
        ]),
      );
      return Promise.resolve(ok({ answers, usage: FAKE_USAGE }));
    },
  };
}

/** How the fake text model answers. */
export interface FakeTextModelOptions {
  /** Raw lines, used in turn by call index (cycling); default `{ fala: "Certo.", gesto: "" }`. */
  readonly lines?: readonly unknown[];
  /** When set, every call fails with it. */
  readonly failure?: AiFailure;
}

/** The fake text model, with the requests it received in order. */
export interface FakeTextModel extends TextModelPort {
  readonly requests: readonly RenderRequest[];
}

const DEFAULT_LINE = { fala: "Certo.", gesto: "" };

/** A fake text model: the scripted lines in turn, or always the failure. */
export function createFakeTextModel(options: FakeTextModelOptions = {}): FakeTextModel {
  const requests: RenderRequest[] = [];
  const lines = options.lines ?? [DEFAULT_LINE];
  return {
    requests,
    renderLine(request) {
      requests.push(request);
      if (options.failure !== undefined) {
        return Promise.resolve(err(options.failure));
      }
      const line = lines[(requests.length - 1) % lines.length];
      return Promise.resolve(ok({ line, usage: FAKE_USAGE }));
    },
  };
}
