import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, onTestFinished } from "vitest";

import {
  findManifestViolations,
  findViolations,
  scanRepository,
  type SourceFile,
} from "./boundaries.ts";

/** The dependency table of overview §2, checked on import statements (ESLint does it too). */

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function file(path: string, source: string): SourceFile {
  return { path, source };
}

describe("the repository (overview §2)", () => {
  it("given the repository sources when checking the dependency table then nothing is violated", () => {
    const { files } = scanRepository(repoRoot);

    expect(findViolations(files)).toEqual([]);
  });

  it("given the repository sources when scanning then every package source folder is read", () => {
    const { files } = scanRepository(repoRoot);

    expect(files.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        "packages/engine/src/index.ts",
        "packages/ai/src/index.ts",
        "packages/ai/src/openrouter/index.ts",
        "apps/server/src/server.ts",
        "apps/web/src/App.tsx",
      ]),
    );
  });

  it("given the repository manifests when checking internal dependencies then nothing is violated", () => {
    const { manifests } = scanRepository(repoRoot);

    expect(findManifestViolations(manifests)).toEqual([]);
  });

  it("given a workspace without a src folder when scanning then it adds its manifest and no file", () => {
    const root = mkdtempSync(join(tmpdir(), "ai-fantasy-boundaries-"));
    onTestFinished(() => {
      rmSync(root, { recursive: true, force: true });
    });
    mkdirSync(join(root, "apps"));
    mkdirSync(join(root, "packages", "engine"), { recursive: true });
    writeFileSync(
      join(root, "packages", "engine", "package.json"),
      '{ "name": "@ai-fantasy/engine" }',
    );

    expect(scanRepository(root)).toEqual({
      files: [],
      manifests: [{ name: "@ai-fantasy/engine", path: "packages/engine/package.json" }],
    });
  });
});

describe("engine", () => {
  it("given the engine importing another workspace package when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/engine/src/a.ts", 'import { AI_ROLES } from "@ai-fantasy/ai";'),
    ]);

    expect(violations).toEqual([
      {
        file: "packages/engine/src/a.ts",
        specifier: "@ai-fantasy/ai",
        reason: "engine may not import @ai-fantasy/ai",
      },
    ]);
  });

  it("given the engine importing a Node built-in when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/engine/src/a.ts", 'import { readFileSync } from "node:fs";'),
    ]);

    expect(violations).toEqual([
      {
        file: "packages/engine/src/a.ts",
        specifier: "node:fs",
        reason: "engine may not import Node.js built-ins",
      },
    ]);
  });

  it("given the engine importing a bare built-in dynamically when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/engine/src/a.ts", 'const fs = await import("fs/promises");'),
    ]);

    expect(violations.map((violation) => violation.specifier)).toEqual(["fs/promises"]);
  });

  it("given the engine importing React when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/engine/src/a.ts", 'import { useState } from "react";'),
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual([
      "engine may not import react",
    ]);
  });

  it("given the engine escaping its package by a relative path when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/engine/src/a.ts", 'import { x } from "../../ai/src/roles.ts";'),
    ]);

    expect(violations).toEqual([
      {
        file: "packages/engine/src/a.ts",
        specifier: "../../ai/src/roles.ts",
        reason: "engine may not reach outside packages/engine",
      },
    ]);
  });

  it("given the engine importing its own modules when checking then nothing is violated", () => {
    const violations = findViolations([
      file(
        "packages/engine/src/rng/draw.ts",
        'import { div } from "../domain/math.ts";\nimport type { Bp } from "./types.ts";\nimport { z } from "zod";',
      ),
    ]);

    expect(violations).toEqual([]);
  });

  it("given an engine test importing a Node built-in when checking then it is ignored", () => {
    const violations = findViolations([
      file("packages/engine/src/a.test.ts", 'import { readFileSync } from "node:fs";'),
    ]);

    expect(violations).toEqual([]);
  });
});

describe("ai", () => {
  it("given the pure AI part importing the adapters when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/ai/src/prompts.ts", 'export * from "./openrouter/index.ts";'),
    ]);

    expect(violations).toEqual([
      {
        file: "packages/ai/src/prompts.ts",
        specifier: "./openrouter/index.ts",
        reason: "ai (pure) may not use the OpenRouter adapters",
      },
    ]);
  });

  it("given the pure AI part importing the adapters by package name when checking then it is a violation", () => {
    const violations = findViolations([
      file("packages/ai/src/prompts.ts", 'import { x } from "@ai-fantasy/ai/openrouter";'),
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual([
      "ai (pure) may not use the OpenRouter adapters",
    ]);
  });

  it("given the pure AI part importing the engine when checking then nothing is violated", () => {
    const violations = findViolations([
      file("packages/ai/src/prompts.ts", 'import { ENGINE_NAME } from "@ai-fantasy/engine";'),
    ]);

    expect(violations).toEqual([]);
  });

  it("given the adapters importing the pure part and Node built-ins when checking then nothing is violated", () => {
    const violations = findViolations([
      file(
        "packages/ai/src/openrouter/client.ts",
        'import { AI_ROLES } from "../roles.ts";\nimport { setTimeout } from "node:timers/promises";',
      ),
    ]);

    expect(violations).toEqual([]);
  });
});

describe("apps", () => {
  it("given the web importing the OpenRouter adapters when checking then it is a violation", () => {
    const violations = findViolations([
      file("apps/web/src/App.tsx", 'import { x } from "@ai-fantasy/ai/openrouter";'),
    ]);

    expect(violations).toEqual([
      {
        file: "apps/web/src/App.tsx",
        specifier: "@ai-fantasy/ai/openrouter",
        reason: "web may not use the OpenRouter adapters",
      },
    ]);
  });

  it("given the web importing the server when checking then it is a violation", () => {
    const violations = findViolations([
      file("apps/web/src/App.tsx", 'import { buildApp } from "@ai-fantasy/server";'),
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual([
      "web may not import @ai-fantasy/server",
    ]);
  });

  it("given the web importing fastify when checking then it is a violation", () => {
    const violations = findViolations([
      file("apps/web/src/App.tsx", 'import Fastify from "fastify";'),
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual(["web may not import fastify"]);
  });

  it("given the web importing a Node built-in when checking then it is a violation", () => {
    const violations = findViolations([
      file("apps/web/src/App.tsx", 'import { join } from "path";'),
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual([
      "web may not import Node.js built-ins",
    ]);
  });

  it("given the server importing the engine and the adapters when checking then nothing is violated", () => {
    const violations = findViolations([
      file(
        "apps/server/src/routes.ts",
        'import { ENGINE_NAME } from "@ai-fantasy/engine";\nimport { x } from "@ai-fantasy/ai/openrouter";\nimport { join } from "node:path";',
      ),
    ]);

    expect(violations).toEqual([]);
  });

  it("given the server importing the web app when checking then it is a violation", () => {
    const violations = findViolations([
      file("apps/server/src/routes.ts", 'import { App } from "@ai-fantasy/web";'),
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual([
      "server may not import @ai-fantasy/web",
    ]);
  });

  it("given a file outside the package sources when checking then it is ignored", () => {
    const violations = findViolations([
      file("scripts/dev.ts", 'import { spawn } from "node:child_process";'),
    ]);

    expect(violations).toEqual([]);
  });
});

describe("manifests", () => {
  it("given the engine manifest depending on a workspace package when checking then it is a violation", () => {
    const violations = findManifestViolations([
      {
        path: "packages/engine/package.json",
        name: "@ai-fantasy/engine",
        dependencies: { "@ai-fantasy/ai": "0.0.0" },
      },
    ]);

    expect(violations).toEqual([
      {
        file: "packages/engine/package.json",
        specifier: "@ai-fantasy/ai",
        reason: "@ai-fantasy/engine may not depend on @ai-fantasy/ai",
      },
    ]);
  });

  it("given the web manifest depending on the server when checking then it is a violation", () => {
    const violations = findManifestViolations([
      {
        path: "apps/web/package.json",
        name: "@ai-fantasy/web",
        devDependencies: { "@ai-fantasy/server": "0.0.0", "@ai-fantasy/engine": "0.0.0" },
      },
    ]);

    expect(violations.map((violation) => violation.specifier)).toEqual(["@ai-fantasy/server"]);
  });

  it("given an unknown workspace manifest when checking then it is a violation", () => {
    const violations = findManifestViolations([
      { path: "packages/extra/package.json", name: "@ai-fantasy/extra" },
    ]);

    expect(violations.map((violation) => violation.reason)).toEqual([
      "@ai-fantasy/extra is not in the dependency table of overview §2",
    ]);
  });
});
