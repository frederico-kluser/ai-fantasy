import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_PORT, loadConfig, type ServerConfig } from "./config.ts";
import { Secret } from "./secret.ts";

/** A repository root for the tests; nothing is written there. */
const ROOT = resolve(tmpdir(), "ai-fantasy-config-repository");
const FAKE_KEY = "sk-or-v1-TEST-ONLY-config-0123456789";

/** The configuration read from `env` with the test repository root. */
function load(env: Readonly<Record<string, string>>) {
  return loadConfig(env, ROOT);
}

/** Every variable the configuration reads, in the order errors are reported. */
const VARIABLES = [
  "OPENROUTER_API_KEY",
  "AI_SOM_MODEL",
  "AI_TEXT_MODEL",
  "AI_TEXT_TEMPERATURE",
  "AI_TEXT_REASONING_EFFORT",
  "AI_TIMEOUT_MS",
  "AI_BUDGET_USD_PER_CONVERSATION",
  "PORT",
  "DATA_DIR",
  "BODY_LIMIT_BYTES",
  "SESSION_BODY_LIMIT_BYTES",
  "LOG_LEVEL",
] as const;

function loaded(env: Readonly<Record<string, string>>): ServerConfig {
  const result = load(env);
  assert.ok(result.ok);
  return result.value;
}

function errorLine(name: string, raw: string, expected: string): string {
  return `Erro: ${name} inválido: ${JSON.stringify(raw)} (${expected}) — Solução: corrija ${name} no ambiente ou no .env (vazio = valor padrão).`;
}

describe("defaults (ai-integration §3, overview §5)", () => {
  it("given an empty environment when loading the config then every default applies", () => {
    expect(load({})).toStrictEqual({
      ok: true,
      value: {
        aiApiKey: undefined,
        systemOneModel: "typesafe/jev-1.14",
        textModel: "xiaomi/mimo-v2.6-pro",
        textTemperature: 0.8,
        textReasoningEffort: undefined,
        aiTimeoutMs: 15_000,
        aiBudgetUsdPerConversation: undefined,
        port: 4318,
        dataDir: join(ROOT, "data"),
        bodyLimitBytes: 1_048_576,
        sessionBodyLimitBytes: 33_554_432,
        logLevel: "info",
      },
    });
  });

  it("given every variable set to an empty value when loading the config then the defaults apply", () => {
    const empty = Object.fromEntries(VARIABLES.map((name) => [name, ""]));

    expect(load(empty)).toStrictEqual(load({}));
  });

  it("given the default port when reading it then it is 4318", () => {
    expect(DEFAULT_PORT).toBe(4318);
  });
});

describe("values from the environment", () => {
  it("given every variable set when loading the config then each value is read under its role name", () => {
    const dataDir = resolve(tmpdir(), "ai-fantasy-config-data");

    const config = loaded({
      AI_SOM_MODEL: "perplexity/pplx-decider-v1.2",
      AI_TEXT_MODEL: "liquid/d1",
      AI_TEXT_TEMPERATURE: "1.25",
      AI_TEXT_REASONING_EFFORT: "medium",
      AI_TIMEOUT_MS: "20000",
      AI_BUDGET_USD_PER_CONVERSATION: "0.5",
      PORT: "4319",
      DATA_DIR: dataDir,
      BODY_LIMIT_BYTES: "2048",
      SESSION_BODY_LIMIT_BYTES: "4096",
      LOG_LEVEL: "debug",
    });

    expect(config).toStrictEqual({
      aiApiKey: undefined,
      systemOneModel: "perplexity/pplx-decider-v1.2",
      textModel: "liquid/d1",
      textTemperature: 1.25,
      textReasoningEffort: "medium",
      aiTimeoutMs: 20_000,
      aiBudgetUsdPerConversation: 0.5,
      port: 4319,
      dataDir,
      bodyLimitBytes: 2048,
      sessionBodyLimitBytes: 4096,
      logLevel: "debug",
    });
  });

  it("given a key when loading the config then it is kept in a Secret that reveals it on request", () => {
    const { aiApiKey } = loaded({ OPENROUTER_API_KEY: FAKE_KEY });

    expect({ isSecret: aiApiKey instanceof Secret, value: aiApiKey?.reveal() }).toEqual({
      isSecret: true,
      value: FAKE_KEY,
    });
  });

  it("given a key when serializing the whole config then the key is not in the text", () => {
    const json = JSON.stringify(loaded({ OPENROUTER_API_KEY: FAKE_KEY }));

    expect({
      hasKey: json.includes(FAKE_KEY),
      field: json.includes('"aiApiKey":"[redacted]"'),
    }).toEqual({ hasKey: false, field: true });
  });

  it("given an absolute DATA_DIR when loading the config then it is kept as it is", () => {
    const dataDir = resolve(tmpdir(), "ai-fantasy-absolute-data");

    expect(loaded({ DATA_DIR: dataDir }).dataDir).toBe(dataDir);
  });

  it("given a relative DATA_DIR when loading the config then it is resolved from the repository root", () => {
    expect(loaded({ DATA_DIR: "custom/sessions" }).dataDir).toBe(
      resolve(ROOT, "custom", "sessions"),
    );
  });

  it.each([
    ["PORT", "0", "port", 0],
    ["PORT", "65535", "port", 65_535],
    ["AI_TEXT_TEMPERATURE", "0", "textTemperature", 0],
    ["AI_TEXT_TEMPERATURE", "2", "textTemperature", 2],
    ["AI_TEXT_TEMPERATURE", "2.0", "textTemperature", 2],
    ["AI_TEXT_TEMPERATURE", "0.05", "textTemperature", 0.05],
    ["AI_TEXT_REASONING_EFFORT", "low", "textReasoningEffort", "low"],
    ["AI_TEXT_REASONING_EFFORT", "high", "textReasoningEffort", "high"],
    ["AI_TIMEOUT_MS", "1", "aiTimeoutMs", 1],
    ["AI_TIMEOUT_MS", "2147483647", "aiTimeoutMs", 2_147_483_647],
    ["AI_BUDGET_USD_PER_CONVERSATION", "0.01", "aiBudgetUsdPerConversation", 0.01],
    ["AI_BUDGET_USD_PER_CONVERSATION", "12", "aiBudgetUsdPerConversation", 12],
    ["BODY_LIMIT_BYTES", "1", "bodyLimitBytes", 1],
    ["BODY_LIMIT_BYTES", "9007199254740991", "bodyLimitBytes", Number.MAX_SAFE_INTEGER],
    ["SESSION_BODY_LIMIT_BYTES", "1", "sessionBodyLimitBytes", 1],
    ["LOG_LEVEL", "silent", "logLevel", "silent"],
    ["LOG_LEVEL", "trace", "logLevel", "trace"],
    ["LOG_LEVEL", "fatal", "logLevel", "fatal"],
  ])("given %s=%j at a limit when loading the config then %s is %j", (name, raw, field, value) => {
    expect(load({ [name]: raw })).toMatchObject({ ok: true, value: { [field]: value } });
  });
});

describe("invalid values (errors as `Erro: … — Solução: …`)", () => {
  const port = "use um inteiro de 0 a 65535";
  const model = "use um id de modelo sem espaços";
  const temperature = "use um número de 0 a 2";
  const effort = "use low, medium ou high";
  const timeout = "use um inteiro de 1 a 2147483647";
  const budget = "use um número maior que 0";
  const limit = "use um inteiro maior que 0";
  const level = "use fatal, error, warn, info, debug, trace ou silent";

  it.each([
    ["PORT", "abc", port],
    ["PORT", "-1", port],
    ["PORT", "43.18", port],
    ["PORT", " 4318", port],
    ["PORT", "4318 ", port],
    ["PORT", "65536", port],
    ["PORT", "99999999999999999999", port],
    ["AI_SOM_MODEL", "typesafe/jev 1.14", model],
    ["AI_TEXT_MODEL", " xiaomi/mimo-v2.6-pro", model],
    ["AI_TEXT_TEMPERATURE", "2.01", temperature],
    ["AI_TEXT_TEMPERATURE", "-0.5", temperature],
    ["AI_TEXT_TEMPERATURE", ".5", temperature],
    ["AI_TEXT_TEMPERATURE", "1.", temperature],
    ["AI_TEXT_TEMPERATURE", "1e0", temperature],
    ["AI_TEXT_TEMPERATURE", "warm", temperature],
    ["AI_TEXT_REASONING_EFFORT", "max", effort],
    ["AI_TEXT_REASONING_EFFORT", "HIGH", effort],
    ["AI_TEXT_REASONING_EFFORT", "off", effort],
    ["AI_TIMEOUT_MS", "0", timeout],
    ["AI_TIMEOUT_MS", "1.5", timeout],
    ["AI_TIMEOUT_MS", "2147483648", timeout],
    ["AI_BUDGET_USD_PER_CONVERSATION", "0", budget],
    ["AI_BUDGET_USD_PER_CONVERSATION", "0.00", budget],
    ["AI_BUDGET_USD_PER_CONVERSATION", "-2", budget],
    ["AI_BUDGET_USD_PER_CONVERSATION", `1${"0".repeat(400)}`, budget],
    ["BODY_LIMIT_BYTES", "0", limit],
    ["BODY_LIMIT_BYTES", "1mb", limit],
    ["BODY_LIMIT_BYTES", "9007199254740992", limit],
    ["SESSION_BODY_LIMIT_BYTES", "0", limit],
    ["SESSION_BODY_LIMIT_BYTES", "-4096", limit],
    ["LOG_LEVEL", "verbose", level],
    ["LOG_LEVEL", "INFO", level],
  ])(
    "given %s=%j when loading the config then it is an error with the solution",
    (name, raw, expected) => {
      expect(load({ [name]: raw })).toEqual({
        ok: false,
        error: errorLine(name, raw, expected),
      });
    },
  );

  it("given several invalid variables when loading the config then each one is reported on its own line, in a fixed order", () => {
    const result = load({ LOG_LEVEL: "loud", PORT: "x", AI_TIMEOUT_MS: "0" });

    expect(result).toEqual({
      ok: false,
      error: [
        errorLine("AI_TIMEOUT_MS", "0", timeout),
        errorLine("PORT", "x", port),
        errorLine("LOG_LEVEL", "loud", level),
      ].join("\n"),
    });
  });

  it("given a key and an invalid variable when loading the config then the error does not contain the key", () => {
    const result = load({ OPENROUTER_API_KEY: FAKE_KEY, PORT: "x" });

    expect(JSON.stringify(result).includes(FAKE_KEY)).toBe(false);
  });
});
