// @ts-check
/**
 * Shared Stryker settings (ADR 0018, testing-strategy §12). Every workspace package
 * has a `stryker.config.mjs` that spreads this object and runs from the package
 * directory, reusing the package's `vitest.config.ts`.
 *
 * Mutated: every code file under `src/` except tests (`index.ts` included: a pure
 * re-export has no mutants, and excluding it would hide any code put there).
 * scripts/mutation-changed.ts lists what never goes through mutation.
 */

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export const strykerBase = {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.config.ts" },
  coverageAnalysis: "perTest",
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  mutate: ["src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", "!src/**/*.{test,spec}.*"],
  ignorePatterns: ["dist", "coverage", "e2e", "bench", ".vitest", "test-results"],
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  tempDirName: ".stryker-tmp",
  cleanTempDir: "always",
  thresholds: { high: 90, low: 80, break: 80 },
};
