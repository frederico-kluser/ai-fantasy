// @ts-check
/**
 * ESLint configuration of the AI Fantasy monorepo (ADR 0020).
 *
 * - Complexity limits: docs/engineering/code-quality.md §1.
 * - Package boundaries: docs/architecture/overview.md §2 (also checked by
 *   scripts/boundaries.test.ts).
 * - Engine determinism: docs/engineering/development-rules.md §5.
 * - Tests have no logic: docs/engineering/testing-strategy.md §2.
 *
 * The rules are verified by scripts/eslint-config.test.ts.
 */
import { builtinModules } from "node:module";

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

const CODE_FILES = ["**/*.{ts,tsx,js,mjs,cjs}"];
const TS_FILES = ["**/*.{ts,tsx}"];
/** Unit and component tests plus E2E specs; E2E helpers are ordinary code. */
const TEST_FILES = ["**/*.test.{ts,tsx}", "**/e2e/**/*.spec.ts"];

const ENGINE_SOURCE = ["packages/engine/src/**/*.ts"];
/** Engine production code and its tests (the benchmark may measure time). */
const ENGINE_CODE_AND_TESTS = ["packages/engine/src/**/*.ts", "packages/engine/test/**/*.ts"];
/** The only engine file allowed to use `/`: CORE-01 defines the truncating `div` there. */
const ENGINE_DIVISION_FILE = "packages/engine/src/domain/math.ts";
const AI_SOURCE = ["packages/ai/src/**/*.ts"];
const AI_ADAPTERS = ["packages/ai/src/openrouter/**/*.ts"];
const SERVER_SOURCE = ["apps/server/src/**/*.ts"];
const WEB_SOURCE = ["apps/web/src/**/*.{ts,tsx}"];

// ---------------------------------------------------------------------------
// Import restrictions (overview §2)
// ---------------------------------------------------------------------------

const BUILTIN_MESSAGE = "Node.js built-ins are not allowed in this package (overview §2).";

/** Bare built-in names (`fs`, `fs/promises`…); `node:` specifiers are caught by a pattern. */
const builtinPaths = builtinModules
  .filter((name) => !name.startsWith("node:"))
  .map((name) => ({ name, message: BUILTIN_MESSAGE }));

const BUILTIN_PATTERN = { regex: "^node:", message: BUILTIN_MESSAGE };
const OPENROUTER_PATTERN = {
  regex: "(^|/)openrouter(/|$)",
  message: "Only the server may use the OpenRouter adapters (overview §2).",
};
const REACT_PATTERN = {
  regex: "^react(-dom)?(/|$)",
  message: "React belongs to apps/web only (overview §2).",
};
const SERVER_PATTERN = {
  regex: "^(@ai-fantasy/server|fastify|@fastify/)",
  message: "Server code belongs to apps/server only (overview §2).",
};

/**
 * @param {Array<{ regex: string; message: string }>} patterns
 * @param {boolean} [withBuiltins] whether Node.js built-ins are forbidden too
 * @returns {import("eslint").Linter.RuleEntry}
 */
function restrictImports(patterns, withBuiltins = false) {
  return [
    "error",
    {
      paths: withBuiltins ? builtinPaths : [],
      patterns: withBuiltins ? [BUILTIN_PATTERN, ...patterns] : patterns,
    },
  ];
}

// ---------------------------------------------------------------------------
// Engine determinism (development-rules §5, ADR 0017)
// ---------------------------------------------------------------------------

/** Clock, randomness, scheduling, locale and network: banned in engine code and tests. */
const NON_DETERMINISTIC_GLOBALS = [
  "Date",
  "performance",
  "crypto",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "queueMicrotask",
  "Intl",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
].map((name) => ({
  name,
  message: `'${name}' is not deterministic; the engine and its tests have no clock, randomness, locale or network (development-rules §5).`,
}));

/** Host environment and non-integer parsing: banned in engine production code. */
const IMPURE_GLOBALS = [
  "window",
  "document",
  "navigator",
  "self",
  "globalThis",
  "global",
  "process",
  "Buffer",
  "require",
  "parseFloat",
].map((name) => ({
  name,
  message: `'${name}' is not pure; the engine has no I/O and holds integers only (development-rules §5).`,
}));

const NON_INTEGER_MATH = [
  "random",
  "pow",
  "exp",
  "expm1",
  "log",
  "log1p",
  "log2",
  "log10",
  "sqrt",
  "cbrt",
  "hypot",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "sinh",
  "cosh",
  "tanh",
  "asinh",
  "acosh",
  "atanh",
  "fround",
  "f16round",
  "PI",
  "E",
  "LN2",
  "LN10",
  "LOG2E",
  "LOG10E",
  "SQRT1_2",
  "SQRT2",
];

const ENGINE_PROPERTIES = [
  ...NON_INTEGER_MATH.map((property) => ({
    object: "Math",
    property,
    message: `Math.${property} is random or not an integer; the engine state holds integers only (development-rules §5).`,
  })),
  { object: "Date", property: "now", message: "The engine has no clock (development-rules §5)." },
  {
    object: "Number",
    property: "parseFloat",
    message: "The engine state holds integers only (development-rules §5).",
  },
  {
    object: "Number",
    property: "EPSILON",
    message: "The engine state holds integers only (development-rules §5).",
  },
  ...[
    "localeCompare",
    "toLocaleString",
    "toLocaleUpperCase",
    "toLocaleLowerCase",
    "toLocaleDateString",
    "toLocaleTimeString",
  ].map((property) => ({
    property,
    message: `${property} depends on the locale of the machine; compare and format explicitly (development-rules §5).`,
  })),
];

const DIVISION_MESSAGE =
  "Divide with div() from packages/engine/src/domain/math.ts (truncating integer division).";

const ENGINE_SYNTAX = [
  {
    selector: "BinaryExpression[operator='**'], AssignmentExpression[operator='**=']",
    message: "Exponentiation is not allowed in the engine (development-rules §5).",
  },
  {
    selector: "Literal[value=type(number)][raw=/\\.|[eE]-/]",
    message: "Decimal numbers are not allowed in the engine; use integers in bp.",
  },
];

const ENGINE_DIVISION_SYNTAX = {
  selector: "BinaryExpression[operator='/'], AssignmentExpression[operator='/=']",
  message: DIVISION_MESSAGE,
};

// ---------------------------------------------------------------------------
// Browser and server specifics
// ---------------------------------------------------------------------------

const WEB_GLOBALS = ["process", "Buffer", "require", "global", "__dirname", "__filename"].map(
  (name) => ({ name, message: `'${name}' does not exist in the browser (overview §6).` }),
);

const OPENROUTER_URL_MESSAGE =
  "The browser never calls OpenRouter; the local server does (ADR 0015).";

const NO_TEST_LOGIC_MESSAGE =
  "Tests have no logic: one behavior per test, no branches, loops or try (testing-strategy §2).";

const TEST_LOGIC = [
  "IfStatement",
  "ConditionalExpression",
  "SwitchStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "TryStatement",
].map((selector) => ({ selector, message: NO_TEST_LOGIC_MESSAGE }));

const EVERY_INTERFACE_MESSAGE =
  "The server listens only on 127.0.0.1 (ADR 0014, development-rules §11).";

export default defineConfig(
  globalIgnores([
    "docs/",
    ".agents/",
    ".claude/",
    "**/dist/",
    "**/coverage/",
    "**/reports/",
    "**/.stryker-tmp/",
    "**/.vitest/",
    "playwright-report/",
    "test-results/",
    "scripts/fixtures/",
  ]),

  {
    name: "ai-fantasy/javascript",
    files: CODE_FILES,
    extends: [js.configs.recommended],
    rules: { eqeqeq: "error" },
  },

  {
    name: "ai-fantasy/typescript",
    files: TS_FILES,
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
    },
  },

  {
    name: "ai-fantasy/complexity",
    files: CODE_FILES,
    plugins: { sonarjs },
    rules: {
      complexity: ["error", 10],
      "sonarjs/cognitive-complexity": ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 5],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },

  {
    // Determinism holds for the engine and for its tests (golden and replay included).
    name: "ai-fantasy/engine-determinism",
    files: ENGINE_CODE_AND_TESTS,
    rules: {
      "no-restricted-globals": ["error", ...NON_DETERMINISTIC_GLOBALS],
      "no-restricted-properties": ["error", ...ENGINE_PROPERTIES],
    },
  },

  {
    // Purity and integer syntax hold for production code only: tests need decimals
    // and division to prove that the engine rejects them.
    name: "ai-fantasy/engine",
    files: ENGINE_SOURCE,
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": restrictImports(
        [
          {
            regex: "^@ai-fantasy/",
            message: "The engine depends on no internal package (overview §2).",
          },
          REACT_PATTERN,
          SERVER_PATTERN,
        ],
        true,
      ),
      "no-restricted-globals": ["error", ...NON_DETERMINISTIC_GLOBALS, ...IMPURE_GLOBALS],
      "no-restricted-syntax": ["error", ...ENGINE_SYNTAX, ENGINE_DIVISION_SYNTAX],
    },
  },

  {
    name: "ai-fantasy/engine-division",
    files: [ENGINE_DIVISION_FILE],
    rules: { "no-restricted-syntax": ["error", ...ENGINE_SYNTAX] },
  },

  {
    name: "ai-fantasy/ai-pure",
    files: AI_SOURCE,
    ignores: [...TEST_FILES, ...AI_ADAPTERS],
    rules: {
      "no-restricted-imports": restrictImports(
        [
          OPENROUTER_PATTERN,
          {
            regex: "^@ai-fantasy/(?!engine$)",
            message: "The pure AI part depends only on @ai-fantasy/engine (overview §2).",
          },
          REACT_PATTERN,
          SERVER_PATTERN,
        ],
        true,
      ),
      "no-restricted-globals": [
        "error",
        ...["fetch", "XMLHttpRequest", "WebSocket", "window", "document", "process"].map(
          (name) => ({
            name,
            message: `The pure AI part has no network or I/O; '${name}' belongs to the adapters (overview §2).`,
          }),
        ),
      ],
    },
  },

  {
    name: "ai-fantasy/ai-adapters",
    files: AI_ADAPTERS,
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": restrictImports([
        REACT_PATTERN,
        {
          regex: "^@ai-fantasy/(server|web)(/|$)",
          message: "Libraries never import apps (overview §2).",
        },
      ]),
    },
  },

  {
    name: "ai-fantasy/server",
    files: SERVER_SOURCE,
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": restrictImports([
        REACT_PATTERN,
        { regex: "^@ai-fantasy/web(/|$)", message: "The server never imports the site." },
      ]),
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/0\\.0\\.0\\.0/]", message: EVERY_INTERFACE_MESSAGE },
        { selector: "Literal[value=/^::$/]", message: EVERY_INTERFACE_MESSAGE },
        {
          selector: "TemplateElement[value.raw=/0\\.0\\.0\\.0/]",
          message: EVERY_INTERFACE_MESSAGE,
        },
        { selector: "TemplateElement[value.raw=/^::$/]", message: EVERY_INTERFACE_MESSAGE },
      ],
    },
  },

  {
    name: "ai-fantasy/web",
    files: WEB_SOURCE,
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": restrictImports([OPENROUTER_PATTERN, SERVER_PATTERN], true),
      "no-restricted-globals": ["error", ...WEB_GLOBALS],
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/openrouter\\.ai/i]", message: OPENROUTER_URL_MESSAGE },
        {
          selector: "TemplateElement[value.raw=/openrouter\\.ai/i]",
          message: OPENROUTER_URL_MESSAGE,
        },
      ],
    },
  },

  {
    name: "ai-fantasy/react-hooks",
    files: WEB_SOURCE,
    extends: [reactHooks.configs.flat["recommended-latest"]],
  },

  {
    name: "ai-fantasy/tests",
    files: TEST_FILES,
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
      "no-restricted-syntax": ["error", ...TEST_LOGIC],
    },
  },

  prettierConfig,
);
