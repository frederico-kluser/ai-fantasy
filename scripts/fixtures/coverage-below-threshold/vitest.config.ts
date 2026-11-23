import { defineConfig } from "vitest/config";

import { COVERAGE_THRESHOLDS } from "../../quality-gates.ts";

// Fixture for scripts/quality-config.test.ts: the same thresholds as the root
// config, applied to a sample whose tests leave one branch uncovered.
export default defineConfig({
  test: {
    include: ["sample.test.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["sample.ts"],
      reporter: ["text-summary"],
      reportsDirectory: process.env["FIXTURE_COVERAGE_DIR"] ?? "coverage",
      thresholds: COVERAGE_THRESHOLDS,
    },
  },
});
