import { defineConfig } from "vitest/config";

import { COVERAGE_THRESHOLDS } from "./scripts/quality-gates.ts";

/**
 * Root Vitest configuration: one project per workspace package (each package's
 * `vitest.config.ts` is also what Stryker runs) plus the `scripts` project for
 * the gate scripts. Coverage is global; thresholds come from ADR 0018.
 */
export default defineConfig({
  test: {
    projects: [
      "packages/*/vitest.config.ts",
      "apps/*/vitest.config.ts",
      {
        extends: false,
        test: {
          name: "scripts",
          include: ["scripts/**/*.test.ts"],
          exclude: ["scripts/fixtures/**", "**/node_modules/**"],
          environment: "node",
          // These tests drive real tools (ESLint, Vitest, git) and need more time.
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}", "scripts/**/*.ts"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts", "scripts/fixtures/**"],
      reporter: ["text-summary", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: COVERAGE_THRESHOLDS,
    },
  },
});
