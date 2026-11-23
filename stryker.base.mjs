// @ts-check
/**
 * Shared Stryker settings (ADR 0018, testing-strategy §12). Every workspace package
 * has a `stryker.config.mjs` that spreads this object and runs from the package
 * directory, reusing the package's `vitest.config.ts`.
 *
 * Mutated: `src/**` production files. Not mutated: tests, type declarations and
 * `index.ts` barrels (they only re-export).
 */

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export const strykerBase = {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.config.ts" },
  coverageAnalysis: "perTest",
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  mutate: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}", "!src/**/*.d.ts", "!src/**/index.ts"],
  ignorePatterns: ["dist", "coverage", "e2e", "bench", ".vitest", "test-results"],
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  tempDirName: ".stryker-tmp",
  cleanTempDir: "always",
  thresholds: { high: 90, low: 80, break: 80 },
};
