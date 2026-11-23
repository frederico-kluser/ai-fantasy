/**
 * Quality gate numbers shared by the tooling (ADR 0018, testing-strategy §12).
 *
 * The root `vitest.config.ts` reads the coverage thresholds from here and
 * `scripts/diff-coverage.ts` reads the minimum for new lines, so a number
 * changes in one place only.
 */

/** Coverage thresholds: repository 90/85 and `packages/engine` 95/90. */
export const COVERAGE_THRESHOLDS = {
  lines: 90,
  branches: 85,
  "packages/engine/src/**": { lines: 95, branches: 90 },
} as const;

/** Minimum line coverage, in percent, of the lines a pull request adds. */
export const NEW_LINES_COVERAGE_MIN = 95;
