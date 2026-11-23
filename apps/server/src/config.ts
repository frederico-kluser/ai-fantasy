/**
 * Typed configuration of the local server, read from the environment
 * (ai-integration §3, overview §5). `main` loads the `.env` of the repository
 * root first; variables already set in the environment win. An empty value
 * counts as absent, so the default applies. Model ids live only here and in the
 * environment; the code names the roles (`systemOneModel`, `textModel`).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import type { Result } from "./result.ts";
import { Secret } from "./secret.ts";

/** The repository root, from this file's place in `apps/server/src` (never from the cwd). */
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Default port of the local server (`PORT`). */
export const DEFAULT_PORT = 4318;

/** Default folder of campaigns and slices (`DATA_DIR`): `data/` at the repository root. */
export const DEFAULT_DATA_DIR = resolve(REPOSITORY_ROOT, "data");

/** Log levels accepted by `LOG_LEVEL` (pino's). */
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

/** Reasoning efforts accepted by `AI_TEXT_REASONING_EFFORT`; empty turns reasoning off. */
const REASONING_EFFORTS = ["low", "medium", "high"] as const;

/** A level of the server log. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** How hard the text model reasons, when the model accepts it. */
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** Defaults of ai-integration §3 and overview §5. */
const DEFAULTS = {
  systemOneModel: "typesafe/jev-1.14",
  textModel: "xiaomi/mimo-v2.6-pro",
  textTemperature: 0.8,
  aiTimeoutMs: 15_000,
  bodyLimitBytes: 1_048_576, // 1 MiB
  sessionBodyLimitBytes: 33_554_432, // 32 MiB
  logLevel: "info",
} as const;

/** The longest delay a Node.js timer accepts (2³¹ − 1 ms); a longer one fires at once. */
const MAX_TIMER_MS = 2_147_483_647;
const HIGHEST_PORT = 65_535;

/** Digits only: no sign, spaces, decimal point or exponent. */
const UNSIGNED_INTEGER = /^\d+$/;
/** Digits with an optional decimal part, as in `0.8`. */
const UNSIGNED_DECIMAL = /^\d+(?:\.\d+)?$/;
/** A model id has no spaces, as in `typesafe/jev-1.14`. */
const MODEL_ID = /^\S+$/;

/** The configuration of the local server. */
export interface ServerConfig {
  /** `OPENROUTER_API_KEY`, wrapped so it never leaks; `undefined` when not configured. */
  readonly aiApiKey: Secret | undefined;
  /** `AI_SOM_MODEL`: model id of the System One Model (typed decisions). */
  readonly systemOneModel: string;
  /** `AI_TEXT_MODEL`: model id of the text model (lines and gestures). */
  readonly textModel: string;
  /** `AI_TEXT_TEMPERATURE`, from 0 to 2: variety of the lines. */
  readonly textTemperature: number;
  /** `AI_TEXT_REASONING_EFFORT`; `undefined` means reasoning off. */
  readonly textReasoningEffort: ReasoningEffort | undefined;
  /** `AI_TIMEOUT_MS`: longest wait for one model call, in milliseconds. */
  readonly aiTimeoutMs: number;
  /** `AI_BUDGET_USD_PER_CONVERSATION`; `undefined` means no ceiling yet (D-23). */
  readonly aiBudgetUsdPerConversation: number | undefined;
  /** `PORT`: TCP port on 127.0.0.1; `0` lets the system pick one. */
  readonly port: number;
  /** `DATA_DIR`, absolute: where campaigns and slices are saved. */
  readonly dataDir: string;
  /** `BODY_LIMIT_BYTES`: largest request body of every route but the session saves. */
  readonly bodyLimitBytes: number;
  /** `SESSION_BODY_LIMIT_BYTES`: largest body when saving a campaign or a slice. */
  readonly sessionBodyLimitBytes: number;
  /** `LOG_LEVEL`: lowest level written to the server log. */
  readonly logLevel: LogLevel;
}

/** Adds a range to a number schema; every failure says the same `error`. */
type Range = (schema: z.ZodNumber, error: { readonly error: string }) => z.ZodNumber;

const between =
  (min: number, max: number): Range =>
  (schema, error) =>
    schema.min(min, error).max(max, error);

const aboveZero: Range = (schema, error) => schema.positive(error);

/** A number written as `pattern` and checked by `range`; any failure is reported as `expected`. */
function numberVariable(pattern: RegExp, expected: string, range: Range) {
  const error = { error: expected };
  return z
    .string()
    .regex(pattern, error)
    .transform(Number)
    .pipe(range(z.number(error), error));
}

const modelId = z.string().regex(MODEL_ID, { error: "use um id de modelo sem espaços" });
const byteLimit = numberVariable(
  UNSIGNED_INTEGER,
  "use um inteiro maior que 0",
  between(1, Number.MAX_SAFE_INTEGER),
);

/** The environment variables, in the order errors are reported (as in `.env.example`). */
const ENVIRONMENT = z.object({
  OPENROUTER_API_KEY: z
    .string()
    .transform((value) => new Secret(value))
    .optional(),
  AI_SOM_MODEL: modelId.default(DEFAULTS.systemOneModel),
  AI_TEXT_MODEL: modelId.default(DEFAULTS.textModel),
  AI_TEXT_TEMPERATURE: numberVariable(
    UNSIGNED_DECIMAL,
    "use um número de 0 a 2",
    between(0, 2),
  ).default(DEFAULTS.textTemperature),
  AI_TEXT_REASONING_EFFORT: z
    .enum(REASONING_EFFORTS, { error: "use low, medium ou high" })
    .optional(),
  AI_TIMEOUT_MS: numberVariable(
    UNSIGNED_INTEGER,
    `use um inteiro de 1 a ${MAX_TIMER_MS}`,
    between(1, MAX_TIMER_MS),
  ).default(DEFAULTS.aiTimeoutMs),
  AI_BUDGET_USD_PER_CONVERSATION: numberVariable(
    UNSIGNED_DECIMAL,
    "use um número maior que 0",
    aboveZero,
  ).optional(),
  PORT: numberVariable(
    UNSIGNED_INTEGER,
    `use um inteiro de 0 a ${HIGHEST_PORT}`,
    between(0, HIGHEST_PORT),
  ).default(DEFAULT_PORT),
  DATA_DIR: z
    .string()
    .transform((value) => resolve(REPOSITORY_ROOT, value))
    .default(DEFAULT_DATA_DIR),
  BODY_LIMIT_BYTES: byteLimit.default(DEFAULTS.bodyLimitBytes),
  SESSION_BODY_LIMIT_BYTES: byteLimit.default(DEFAULTS.sessionBodyLimitBytes),
  LOG_LEVEL: z
    .enum(LOG_LEVELS, { error: "use fatal, error, warn, info, debug, trace ou silent" })
    .default(DEFAULTS.logLevel),
});

const VARIABLE_NAMES = Object.keys(ENVIRONMENT.shape);

/** What a failed check reports: the variable is the first step of the path. */
interface Issue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

function presentValues(
  env: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    VARIABLE_NAMES.map((name) => [name, env[name] === "" ? undefined : env[name]]),
  );
}

/** One `Erro: … — Solução: …` line per invalid variable (the key is never validated). */
function errorLines(
  issues: readonly Issue[],
  env: Readonly<Record<string, string | undefined>>,
): string {
  const lines = issues.map((issue) => {
    const name = String(issue.path[0]);
    return `Erro: ${name} inválido: ${JSON.stringify(env[name])} (${issue.message}) — Solução: corrija ${name} no ambiente ou no .env (vazio = valor padrão).`;
  });
  return [...new Set(lines)].join("\n");
}

function toServerConfig(env: z.output<typeof ENVIRONMENT>): ServerConfig {
  return {
    aiApiKey: env.OPENROUTER_API_KEY,
    systemOneModel: env.AI_SOM_MODEL,
    textModel: env.AI_TEXT_MODEL,
    textTemperature: env.AI_TEXT_TEMPERATURE,
    textReasoningEffort: env.AI_TEXT_REASONING_EFFORT,
    aiTimeoutMs: env.AI_TIMEOUT_MS,
    aiBudgetUsdPerConversation: env.AI_BUDGET_USD_PER_CONVERSATION,
    port: env.PORT,
    dataDir: env.DATA_DIR,
    bodyLimitBytes: env.BODY_LIMIT_BYTES,
    sessionBodyLimitBytes: env.SESSION_BODY_LIMIT_BYTES,
    logLevel: env.LOG_LEVEL,
  };
}

/**
 * Reads the configuration from `env` (in production, `process.env`).
 *
 * @returns the configuration, or one `Erro: … — Solução: …` line per invalid
 *   variable, in the order of `.env.example`. The key is never part of an error.
 */
export function loadConfig(
  env: Readonly<Record<string, string | undefined>>,
): Result<ServerConfig> {
  const parsed = ENVIRONMENT.safeParse(presentValues(env));
  if (!parsed.success) {
    return { ok: false, error: errorLines(parsed.error.issues, env) };
  }
  return { ok: true, value: toServerConfig(parsed.data) };
}
