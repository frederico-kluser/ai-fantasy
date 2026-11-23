import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import rootConfig from "../vitest.config.ts";

import { NEW_LINES_COVERAGE_MIN } from "./quality-gates.ts";

/**
 * The quality gates are configuration; these tests pin the numbers of ADR 0018 and
 * show that the coverage command really fails below them.
 */

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureDir = join(repoRoot, "scripts", "fixtures", "coverage-below-threshold");
const coverageOut = mkdtempSync(join(tmpdir(), "ai-fantasy-coverage-"));

afterAll(() => {
  rmSync(coverageOut, { recursive: true, force: true });
});

async function importStrykerConfig(packageDir: string): Promise<unknown> {
  const url = pathToFileURL(join(repoRoot, packageDir, "stryker.config.mjs")).href;
  const module: unknown = await import(url);
  return module;
}

describe("coverage thresholds (ADR 0018)", () => {
  it("given the root Vitest config when reading the thresholds then they are 90/85 and 95/90 for the engine", () => {
    expect(rootConfig.test?.coverage?.thresholds).toEqual({
      lines: 90,
      branches: 85,
      "packages/engine/src/**": { lines: 95, branches: 90 },
    });
  });

  it("given the root Vitest config when reading the reporters then lcov and json-summary are written", () => {
    expect(rootConfig.test?.coverage?.reporter).toEqual(["text-summary", "lcov", "json-summary"]);
  });

  it("given the quality gates when reading the new lines minimum then it is 95", () => {
    expect(NEW_LINES_COVERAGE_MIN).toBe(95);
  });

  it("given coverage below the threshold when running coverage then the command fails", () => {
    const run = spawnSync(
      process.execPath,
      [
        join(repoRoot, "node_modules", "vitest", "vitest.mjs"),
        "run",
        "--root",
        fixtureDir,
        "--config",
        join(fixtureDir, "vitest.config.ts"),
      ],
      { encoding: "utf8", env: { ...process.env, FIXTURE_COVERAGE_DIR: coverageOut } },
    );

    expect({ status: run.status, output: `${run.stdout}${run.stderr}` }).toEqual({
      status: 1,
      output: expect.stringContaining("does not meet global threshold") as unknown,
    });
  });
});

describe("mutation thresholds (ADR 0018)", () => {
  it("given the engine Stryker config when reading the break threshold then it is 90", async () => {
    expect(await importStrykerConfig("packages/engine")).toMatchObject({
      default: { thresholds: { break: 90 } },
    });
  });

  it.each(["packages/ai", "apps/server", "apps/web"])(
    "given the %s Stryker config when reading the break threshold then it is 80",
    async (packageDir) => {
      expect(await importStrykerConfig(packageDir)).toMatchObject({
        default: { thresholds: { break: 80 } },
      });
    },
  );

  it.each(["packages/engine", "packages/ai", "apps/server", "apps/web"])(
    "given the %s Stryker config when reading the run options then it is incremental, per test and reuses vitest.config.ts",
    async (packageDir) => {
      expect(await importStrykerConfig(packageDir)).toMatchObject({
        default: {
          testRunner: "vitest",
          coverageAnalysis: "perTest",
          incremental: true,
          vitest: { configFile: "vitest.config.ts" },
        },
      });
    },
  );

  it("given the shared Stryker config when reading what is mutated then tests and barrels are left out", async () => {
    expect(await importStrykerConfig("apps/server")).toMatchObject({
      default: {
        mutate: [
          "src/**/*.{ts,tsx}",
          "!src/**/*.test.{ts,tsx}",
          "!src/**/*.d.ts",
          "!src/**/index.ts",
        ],
      },
    });
  });
});
