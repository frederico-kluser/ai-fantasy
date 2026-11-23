import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Tests of `eslint.config.js` through the ESLint API (code-quality §1, overview §2).
 * `lintText` with a `filePath` inside a package applies that package's rules, so
 * the probes never touch the disk.
 */

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

let untyped: ESLint;
let typed: ESLint;

beforeAll(() => {
  // Syntax and import rules do not need type information, so most probes run
  // without the TypeScript project service and may use paths that do not exist.
  untyped = new ESLint({ cwd: repoRoot, overrideConfig: tseslint.configs.disableTypeChecked });
  typed = new ESLint({ cwd: repoRoot });
});

async function ruleIds(linter: ESLint, code: string, filePath: string): Promise<string[]> {
  const results = await linter.lintText(code, { filePath });
  return results.flatMap((result) => result.messages.map((message) => String(message.ruleId)));
}

async function untypedRuleIds(code: string, filePath: string): Promise<string[]> {
  return ruleIds(untyped, code, filePath);
}

function lines(count: number, make: (index: number) => string): string {
  return Array.from({ length: count }, (_, index) => make(index)).join("\n");
}

const ELEVEN_BRANCHES = `export function pick(value: number): number {
${lines(11, (index) => `  if (value === ${String(index)}) return ${String(index)};`)}
  return -1;
}
`;

describe("engine determinism (development-rules §5)", () => {
  it("given a file in packages/engine calling Math.random when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const roll = (): number => Math.random();\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-properties");
  });

  it("given the engine reading the clock with Date.now when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const now = (): number => Date.now();\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-globals");
  });

  it("given the engine calling Math.sqrt when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const root = (value: number): number => Math.sqrt(value);\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-properties");
  });

  it("given the engine dividing with the slash operator when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const half = (value: number): number => value / 2;\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given domain/math.ts dividing with the slash operator when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      "export const div = (a: number, b: number): number => Math.trunc(a / b);\n",
      "packages/engine/src/domain/math.ts",
    );

    expect(ids).toEqual([]);
  });

  it("given domain/math.ts using a decimal literal when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const HALF = 0.5;\n",
      "packages/engine/src/domain/math.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given the engine using a decimal literal when linting then lint fails", async () => {
    const ids = await untypedRuleIds("export const HALF = 0.5;\n", "packages/engine/src/probe.ts");

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given the engine using a negative exponent literal when linting then lint fails", async () => {
    const ids = await untypedRuleIds("export const TINY = 1e-3;\n", "packages/engine/src/probe.ts");

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given the engine using integer literals when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      "export const LIMITS = [0, 10_000, 0x10, 1e3, -10000];\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toEqual([]);
  });

  it("given the engine using the exponent operator when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const square = (value: number): number => value ** 2;\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });
});

describe("package boundaries (overview §2)", () => {
  it("given the engine importing a node: built-in when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { readFileSync } from "node:fs";\nexport const read = readFileSync;\n',
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given the engine importing a bare built-in when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { join } from "path";\nexport const joinPath = join;\n',
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given the engine importing another workspace package when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { AI_ROLES } from "@ai-fantasy/ai";\nexport const roles = AI_ROLES;\n',
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given the engine importing React when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { useState } from "react";\nexport const hook = useState;\n',
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given the pure AI part importing the OpenRouter adapters when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'export * from "./openrouter/index.ts";\n',
      "packages/ai/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given the pure AI part calling fetch when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const call = (url: string): Promise<Response> => fetch(url);\n",
      "packages/ai/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-globals");
  });

  it("given the pure AI part importing the engine when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      'import { ENGINE_NAME } from "@ai-fantasy/engine";\nexport const name = ENGINE_NAME;\n',
      "packages/ai/src/probe.ts",
    );

    expect(ids).toEqual([]);
  });

  it("given the OpenRouter adapters calling fetch when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      "export const call = (url: string): Promise<Response> => fetch(url);\n",
      "packages/ai/src/openrouter/probe.ts",
    );

    expect(ids).toEqual([]);
  });

  it("given apps/web importing the OpenRouter adapters when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'export * from "@ai-fantasy/ai/openrouter";\n',
      "apps/web/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given apps/web reaching the adapters by a relative path when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'export * from "../../../packages/ai/src/openrouter/index.ts";\n',
      "apps/web/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given apps/web importing the server framework when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import Fastify from "fastify";\nexport const make = Fastify;\n',
      "apps/web/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given apps/web importing a Node built-in when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { readFile } from "node:fs/promises";\nexport const read = readFile;\n',
      "apps/web/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-imports");
  });

  it("given apps/web calling the OpenRouter URL when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'export const url = "https://openrouter.ai/api/v1/chat/completions";\n',
      "apps/web/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given apps/web importing the engine and the pure AI part when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      'import { AI_ROLES } from "@ai-fantasy/ai";\nimport { ENGINE_NAME } from "@ai-fantasy/engine";\nexport const labels = [ENGINE_NAME, ...AI_ROLES];\n',
      "apps/web/src/probe.ts",
    );

    expect(ids).toEqual([]);
  });

  it("given the server listening on 0.0.0.0 when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'export const HOST = "0.0.0.0";\n',
      "apps/server/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });
});

describe("complexity limits (code-quality §1)", () => {
  it("given a function with cyclomatic complexity above 10 when linting then lint fails", async () => {
    const ids = await untypedRuleIds(ELEVEN_BRANCHES, "apps/server/src/probe.ts");

    expect(ids).toContain("complexity");
  });

  it("given a function with cognitive complexity above 10 when linting then lint fails", async () => {
    const ids = await untypedRuleIds(ELEVEN_BRANCHES, "apps/server/src/probe.ts");

    expect(ids).toContain("sonarjs/cognitive-complexity");
  });

  it("given a function longer than 40 lines when linting then lint fails", async () => {
    const code = `export function long(): number {\n  let total = 0;\n${lines(40, () => "  total += 1;")}\n  return total;\n}\n`;

    const ids = await untypedRuleIds(code, "apps/server/src/probe.ts");

    expect(ids).toContain("max-lines-per-function");
  });

  it("given a long test body when linting then the function length limit does not apply", async () => {
    const code = `import { expect, it } from "vitest";\n\nit("given a long arrangement when asserting then it passes", () => {\n  const values: number[] = [];\n${lines(45, (index) => `  values.push(${String(index)});`)}\n  expect(values).toHaveLength(45);\n});\n`;

    const ids = await untypedRuleIds(code, "apps/server/src/probe.test.ts");

    expect(ids).toEqual([]);
  });

  it("given a function with six parameters when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const sum = (a: number, b: number, c: number, d: number, e: number, f: number): number => a + b + c + d + e + f;\n",
      "apps/server/src/probe.ts",
    );

    expect(ids).toContain("max-params");
  });

  it("given blocks nested four levels deep when linting then lint fails", async () => {
    const code =
      "export function deep(flag: boolean): number {\n  if (flag) {\n    if (flag) {\n      if (flag) {\n        if (flag) {\n          return 1;\n        }\n      }\n    }\n  }\n  return 0;\n}\n";

    const ids = await untypedRuleIds(code, "apps/server/src/probe.ts");

    expect(ids).toContain("max-depth");
  });

  it("given a file longer than 400 lines when linting then lint fails", async () => {
    const code = `${lines(401, (index) => `export const value${String(index)} = ${String(index)};`)}\n`;

    const ids = await untypedRuleIds(code, "apps/server/src/probe.ts");

    expect(ids).toContain("max-lines");
  });
});

describe("tests have no logic (testing-strategy §2)", () => {
  it("given an if statement in a test when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { it } from "vitest";\n\nit("given x when y then z", () => {\n  if (Date.now() > 0) {\n    return;\n  }\n});\n',
      "packages/engine/src/probe.test.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given a conditional expression in a test when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { expect, it } from "vitest";\n\nit("given x when y then z", () => {\n  expect(Date.now() > 0 ? 1 : 2).toBe(1);\n});\n',
      "apps/web/src/probe.test.tsx",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given a switch in a test when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { it } from "vitest";\n\nit("given x when y then z", () => {\n  switch (Date.now()) {\n    default:\n      break;\n  }\n});\n',
      "scripts/probe.test.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given logic in an E2E spec when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { test } from "@playwright/test";\n\ntest("given x when y then z", () => {\n  if (Date.now() > 0) {\n    return;\n  }\n});\n',
      "apps/web/e2e/probe.spec.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });
});

describe("TypeScript rules (development-rules §4)", () => {
  it("given an explicit any when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const parse = (raw: string): any => JSON.parse(raw);\n",
      "apps/server/src/probe.ts",
    );

    expect(ids).toContain("@typescript-eslint/no-explicit-any");
  });

  it("given a type imported without the type keyword when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { FastifyInstance } from "fastify";\nexport const keep = (app: FastifyInstance): FastifyInstance => app;\n',
      "apps/server/src/probe.ts",
    );

    expect(ids).toContain("@typescript-eslint/consistent-type-imports");
  });

  it("given a floating promise when linting with types then lint fails", async () => {
    const ids = await ruleIds(
      typed,
      "async function work(): Promise<number> {\n  return Promise.resolve(1);\n}\n\nexport function start(): void {\n  work();\n}\n",
      "apps/server/src/server.ts",
    );

    expect(ids).toContain("@typescript-eslint/no-floating-promises");
  });
});
