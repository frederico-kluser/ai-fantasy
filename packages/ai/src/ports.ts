/**
 * The two AI ports (overview §4, ai-integration §1): asynchronous, returning a
 * `Result` with a typed failure, and the usage of each call for the cost and
 * time metrics of the evaluation. The adapters (AI-02, AI-03) implement them
 * on the server; the fakes implement them in tests. What a port returns is
 * model output: it is validated here before anything reads it (ADR 0016).
 */
import type { Result } from "@ai-fantasy/engine";

import type { DecisionCall, JsonValue } from "./prompts/questions.ts";

/** What a call cost and took (ai-integration §5.4 and §6). */
export interface CallUsage {
  /** The model id the gateway resolved (configuration data, never an identifier). */
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** The amount charged, in US dollars. */
  readonly costUsd: number;
  /** Wall time of the call, in milliseconds (measured by the adapter, never by the engine). */
  readonly latencyMs: number;
}

/**
 * Why a call failed (ai-integration §4.5). Every failure leads to the
 * alternative path: the act menu for the SOM, a fallback line for the text
 * model.
 */
export type AiFailure =
  /** The call took longer than `AI_TIMEOUT_MS`. */
  | { readonly kind: "TIMEOUT" }
  /** 400, 401, 402, 403, 404, 413, 422: not retried. */
  | { readonly kind: "HTTP_TERMINAL"; readonly status: number; readonly message: string }
  /** 429 or 5xx after the 2 retries. */
  | { readonly kind: "HTTP_RETRIES_EXHAUSTED"; readonly status: number; readonly attempts: number }
  /** The connection itself failed. */
  | { readonly kind: "NETWORK"; readonly message: string }
  /** HTTP 200 whose body is not the expected shape, or that carries `error`. */
  | { readonly kind: "INVALID_RESPONSE"; readonly message: string }
  /** The model or the provider refused. */
  | { readonly kind: "REFUSED"; readonly message: string }
  /** `OPENROUTER_API_KEY` is not set. */
  | { readonly kind: "MISSING_KEY" }
  /** The conversation passed its cost ceiling (D-23). */
  | { readonly kind: "BUDGET_EXCEEDED" };

/** The kind of an {@link AiFailure}. */
export type AiFailureKind = AiFailure["kind"];

/**
 * What the SOM port returns: the answers in the neutral form (the `score` on
 * the 2..10 ruler; ai-integration §4.2) and the usage. `answers` is unknown on
 * purpose: `validateAnswers` checks it against the questions asked.
 */
export interface DecisionReply {
  readonly answers: unknown;
  readonly usage: CallUsage;
}

/** The SOM (System One Model): turns free text into typed decisions. */
export interface SystemOnePort {
  /** Asks the questions of one call (at most 16). */
  decide(call: DecisionCall): Promise<Result<DecisionReply, AiFailure>>;
}

/**
 * One request to the text model (ai-integration §5.2): the system message and
 * the staging package that goes as the user message, in JSON. The package
 * itself is built by AI-03.
 */
export interface RenderRequest {
  readonly system: string;
  readonly package: JsonValue;
}

/** What the text model port returns: the raw line (validated by `validateLine`) and the usage. */
export interface RenderReply {
  readonly line: unknown;
  readonly usage: CallUsage;
}

/** The text model: voices an act that the engine already resolved. */
export interface TextModelPort {
  renderLine(request: RenderRequest): Promise<Result<RenderReply, AiFailure>>;
}
