import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Tests of `eslint.config.js` through the ESLint API (code-quality §1, overview §2).
 * `lintText` with a `filePath` inside a package applies that package's rules, so
 * the probes never touch the disk. Limits are probed exactly at the boundary: the
 * first value over the limit fails and the limit itself passes.
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

/** `count` independent `if`s: cyclomatic complexity count + 1, cognitive count. */
function sequentialIfs(count: number): string {
  return `export function pick(value: number): number {
${lines(count, (index) => `  if (value === ${String(index)}) return ${String(index)};`)}
  return -1;
}
`;
}

/** Three nested `if`s (cognitive 1 + 2 + 3) plus `count` independent ones. */
function nestedThenSequentialIfs(count: number): string {
  return `export function rank(value: number): number {
  if (value > 100) {
    if (value > 200) {
      if (value > 300) {
        return 3;
      }
    }
  }
${lines(count, (index) => `  if (value === ${String(index)}) return ${String(index)};`)}
  return -1;
}
`;
}

/** A function of exactly `count` lines (signature and closing brace included). */
function functionOfLines(count: number): string {
  return `export function long(): number {
  let total = 0;
${lines(count - 4, () => "  total += 1;")}
  return total;
}
`;
}

function parameters(count: number): string {
  const names = Array.from({ length: count }, (_, index) => `p${String(index)}`);
  return `export const sum = (${names.map((name) => `${name}: number`).join(", ")}): number => ${names.join(" + ")};\n`;
}

/** `depth` nested `if` blocks. */
function nestedBlocks(depth: number): string {
  const open = lines(depth, (level) => `${"  ".repeat(level + 1)}if (flag) {`);
  const close = lines(depth, (level) => `${"  ".repeat(depth - level)}}`);
  return `export function deep(flag: boolean): number {\n${open}\n${"  ".repeat(depth + 1)}return 1;\n${close}\n  return 0;\n}\n`;
}

function fileOfLines(count: number): string {
  return `${lines(count, (index) => `export const value${String(index)} = ${String(index)};`)}\n`;
}

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

  it("given the engine reading Math.PI when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const turn = (): number => Math.PI;\n",
      "packages/engine/src/probe.ts",
    );

    expect(ids).toContain("no-restricted-properties");
  });

  it.each([
    "localeCompare",
    "toLocaleString",
    "toLocaleUpperCase",
    "toLocaleLowerCase",
    "toLocaleDateString",
    "toLocaleTimeString",
  ])(
    "given the engine calling the locale-dependent %s when linting then lint fails",
    async (method) => {
      const ids = await untypedRuleIds(
        `export const show = (value: string): unknown => value.${method}();\n`,
        "packages/engine/src/probe.ts",
      );

      expect(ids).toEqual(["no-restricted-properties"]);
    },
  );

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

  it("given an engine test calling Math.random when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { expect, it } from "vitest";\n\nit("given x when y then z", () => {\n  expect(Math.random()).toBeLessThan(1);\n});\n',
      "packages/engine/src/probe.test.ts",
    );

    expect(ids).toEqual(["no-restricted-properties"]);
  });

  it("given an engine test helper reading the clock when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      "export const stamp = (): number => Date.now();\n",
      "packages/engine/test/helpers/clock.ts",
    );

    expect(ids).toContain("no-restricted-globals");
  });

  it("given an engine test with decimals and division when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      'import { expect, it } from "vitest";\n\nit("given a fraction when validating then it is rejected", () => {\n  expect(Number.isInteger(1 / 2 + 0.5 ** 1)).toBe(true);\n});\n',
      "packages/engine/src/probe.test.ts",
    );

    expect(ids).toEqual([]);
  });

  it("given the engine benchmark measuring time with performance when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      "export const elapsed = (start: number): number => performance.now() - start;\n",
      "packages/engine/bench/probe.ts",
    );

    expect(ids).toEqual([]);
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

  it.each([
    'export const HOST = "0.0.0.0";\n',
    "export const HOST = `0.0.0.0`;\n",
    "export const url = (port: number): string => `http://0.0.0.0:${String(port)}`;\n",
    'export const HOST = "::";\n',
  ])(
    "given the server listening on every interface (%j) when linting then lint fails",
    async (code) => {
      const ids = await untypedRuleIds(code, "apps/server/src/probe.ts");

      expect(ids).toEqual(["no-restricted-syntax"]);
    },
  );
});

describe("complexity limits (code-quality §1)", () => {
  it("given a function with cyclomatic complexity 11 when linting then only the complexity limit fails", async () => {
    const ids = await untypedRuleIds(sequentialIfs(10), "apps/server/src/probe.ts");

    expect(ids).toEqual(["complexity"]);
  });

  it("given a function with cyclomatic complexity 10 when linting then lint passes", async () => {
    const ids = await untypedRuleIds(sequentialIfs(9), "apps/server/src/probe.ts");

    expect(ids).toEqual([]);
  });

  it("given a function with cognitive complexity 11 when linting then only the cognitive limit fails", async () => {
    const ids = await untypedRuleIds(nestedThenSequentialIfs(5), "apps/server/src/probe.ts");

    expect(ids).toEqual(["sonarjs/cognitive-complexity"]);
  });

  it("given a function with cognitive complexity 10 when linting then lint passes", async () => {
    const ids = await untypedRuleIds(nestedThenSequentialIfs(4), "apps/server/src/probe.ts");

    expect(ids).toEqual([]);
  });

  it("given a function of 41 lines when linting then the function length limit fails", async () => {
    const ids = await untypedRuleIds(functionOfLines(41), "apps/server/src/probe.ts");

    expect(ids).toEqual(["max-lines-per-function"]);
  });

  it("given a function of 40 lines when linting then lint passes", async () => {
    const ids = await untypedRuleIds(functionOfLines(40), "apps/server/src/probe.ts");

    expect(ids).toEqual([]);
  });

  it("given a function with six parameters when linting then the parameter limit fails", async () => {
    const ids = await untypedRuleIds(parameters(6), "apps/server/src/probe.ts");

    expect(ids).toEqual(["max-params"]);
  });

  it("given a function with five parameters when linting then lint passes", async () => {
    const ids = await untypedRuleIds(parameters(5), "apps/server/src/probe.ts");

    expect(ids).toEqual([]);
  });

  it("given blocks nested four levels deep when linting then the nesting limit fails", async () => {
    const ids = await untypedRuleIds(nestedBlocks(4), "apps/server/src/probe.ts");

    expect(ids).toEqual(["max-depth"]);
  });

  it("given blocks nested three levels deep when linting then lint passes", async () => {
    const ids = await untypedRuleIds(nestedBlocks(3), "apps/server/src/probe.ts");

    expect(ids).toEqual([]);
  });

  it("given a file of 401 lines when linting then the file length limit fails", async () => {
    const ids = await untypedRuleIds(fileOfLines(401), "apps/server/src/probe.ts");

    expect(ids).toEqual(["max-lines"]);
  });

  it("given a file of 400 lines when linting then lint passes", async () => {
    const ids = await untypedRuleIds(fileOfLines(400), "apps/server/src/probe.ts");

    expect(ids).toEqual([]);
  });

  it("given a long test body when linting then the function length limit does not apply", async () => {
    const code = `import { expect, it } from "vitest";\n\nit("given a long arrangement when asserting then it passes", () => {\n  const values: number[] = [];\n${lines(45, (index) => `  values.push(${String(index)});`)}\n  expect(values).toHaveLength(45);\n});\n`;

    const ids = await untypedRuleIds(code, "apps/server/src/probe.test.ts");

    expect(ids).toEqual([]);
  });

  it("given a test file longer than 400 lines when linting then the file length limit does not apply", async () => {
    const code = `import { expect, it } from "vitest";\n\nconst values = [\n${lines(401, (index) => `  ${String(index)},`)}\n];\n\nit("given many values when counting then all are there", () => {\n  expect(values).toHaveLength(401);\n});\n`;

    const ids = await untypedRuleIds(code, "apps/server/src/probe.test.ts");

    expect(ids).toEqual([]);
  });
});

describe("tests have no logic (testing-strategy §2)", () => {
  it.each([
    ["an if statement", "  if (Date.now() > 0) {\n    return;\n  }"],
    ["a conditional expression", "  expect(Date.now() > 0 ? 1 : 2).toBe(1);"],
    ["a switch", "  switch (Date.now()) {\n    default:\n      break;\n  }"],
    [
      "a for loop",
      "  for (let index = 0; index < 2; index += 1) {\n    expect(index).toBeGreaterThan(-1);\n  }",
    ],
    ["a for…in loop", '  for (const key in { a: 1 }) {\n    expect(key).toBe("a");\n  }'],
    [
      "a for…of loop",
      "  for (const value of [1, 2]) {\n    expect(value).toBeGreaterThan(0);\n  }",
    ],
    ["a while loop", "  while (Date.now() < 0) {\n    expect(1).toBe(1);\n  }"],
    ["a do…while loop", "  do {\n    expect(1).toBe(1);\n  } while (Date.now() < 0);"],
    [
      "a try/catch",
      "  try {\n    expect(1).toBe(1);\n  } catch (error) {\n    expect(error).toBeUndefined();\n  }",
    ],
  ])("given %s in a test when linting then lint fails", async (_kind, body) => {
    const ids = await untypedRuleIds(
      `import { expect, it } from "vitest";\n\nit("given x when y then z", () => {\n${body}\n});\n`,
      "apps/server/src/probe.test.ts",
    );

    expect(ids).toContain("no-restricted-syntax");
  });

  it("given a loop in an E2E spec when linting then lint fails", async () => {
    const ids = await untypedRuleIds(
      'import { expect, test } from "@playwright/test";\n\ntest("given x when y then z", () => {\n  for (const value of [1, 2]) {\n    expect(value).toBeGreaterThan(0);\n  }\n});\n',
      "apps/web/e2e/probe.spec.ts",
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

  it("given a test with ?? and || when linting then lint passes", async () => {
    const ids = await untypedRuleIds(
      'import { expect, it } from "vitest";\n\nit("given defaults when reading then they apply", () => {\n  const values = new Map<string, number>();\n  expect(values.get("a") ?? 0).toBe(0);\n  expect(values.size || 1).toBe(1);\n});\n',
      "apps/server/src/probe.test.ts",
    );

    expect(ids).toEqual([]);
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
