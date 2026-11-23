/**
 * Coverage of the lines a change adds (ADR 0018: at least 95%).
 *
 * Added lines come from `git diff -U0 <merge-base>` (committed and uncommitted
 * changes) plus the files git does not track yet; instrumented lines come from
 * `coverage/lcov.info`. Only lines that are both new and instrumented count.
 * The summary also goes to `$GITHUB_STEP_SUMMARY` when it is set.
 *
 * Usage: `npm run coverage:diff [-- --base <ref>] [--lcov <file>]` after
 * `npm run coverage`. The base defaults to `origin/main`.
 */
import { parseArgs } from "node:util";

import { changesSince, type Changes } from "./lib/changes.ts";
import { appendStepSummary, readTextFile, runGit, type GitResult } from "./lib/io.ts";
import type { Result } from "./lib/result.ts";
import { NEW_LINES_COVERAGE_MIN } from "./quality-gates.ts";

/** Coverage of the new lines of one file. */
export interface FileDiffCoverage {
  readonly file: string;
  readonly covered: number;
  readonly total: number;
  readonly uncovered: readonly number[];
}

/** Coverage of all new lines. */
export interface DiffCoverage {
  readonly covered: number;
  readonly total: number;
  readonly files: readonly FileDiffCoverage[];
}

/** What {@link main} needs from the outside world. */
export interface DiffCoverageIo {
  readonly git: (args: readonly string[]) => GitResult;
  readonly readText: (path: string) => string | undefined;
  readonly appendSummary: (markdown: string) => void;
  readonly log: (line: string) => void;
}

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
const DIFF_ARGS = ["diff", "-U0", "--no-color", "--no-ext-diff", "--find-renames"];

interface DiffState {
  file: string | undefined;
  line: number;
  inHunk: boolean;
}

function readDiffLine(state: DiffState, text: string, added: Map<string, Set<number>>): void {
  const hunk = HUNK.exec(text);
  if (text.startsWith("diff --git ")) {
    Object.assign(state, { file: undefined, inHunk: false });
  } else if (hunk !== null) {
    Object.assign(state, { line: Number(hunk[1]), inHunk: true });
  } else if (!state.inHunk && text.startsWith("+++ ")) {
    state.file = text.startsWith("+++ b/") ? text.slice("+++ b/".length) : undefined;
  } else if (state.inHunk && state.file !== undefined) {
    readHunkLine(state, state.file, text, added);
  }
}

function readHunkLine(
  state: DiffState,
  file: string,
  text: string,
  added: Map<string, Set<number>>,
): void {
  if (text.startsWith("+")) {
    added.set(file, (added.get(file) ?? new Set<number>()).add(state.line));
    state.line += 1;
  } else if (text.startsWith(" ")) {
    state.line += 1;
  }
}

/** Line numbers (in the new version) that a unified diff adds, per file. */
export function parseAddedLines(diff: string): Map<string, Set<number>> {
  const added = new Map<string, Set<number>>();
  const state: DiffState = { file: undefined, line: 0, inHunk: false };
  for (const text of diff.split("\n")) {
    readDiffLine(state, text, added);
  }
  return added;
}

/** Turns an lcov `SF:` path into a repository-relative POSIX path. */
function relativeTo(root: string, path: string): string {
  const file = path.replaceAll("\\", "/");
  const prefix = `${root.replaceAll("\\", "/").replace(/\/$/, "")}/`;
  return file.toLowerCase().startsWith(prefix.toLowerCase()) ? file.slice(prefix.length) : file;
}

/** Hits per instrumented line, per repository-relative file, from an lcov report. */
export function parseLcov(lcov: string, root: string): Map<string, Map<number, number>> {
  const files = new Map<string, Map<number, number>>();
  let current: Map<number, number> | undefined;
  for (const text of lcov.split(/\r?\n/)) {
    if (text.startsWith("SF:")) {
      const file = relativeTo(root, text.slice("SF:".length));
      current = files.get(file) ?? new Map<number, number>();
      files.set(file, current);
    } else if (text.startsWith("DA:") && current !== undefined) {
      const [line = 0, hits = 0] = text.slice("DA:".length).split(",").map(Number);
      current.set(line, Math.max(hits, current.get(line) ?? 0));
    }
  }
  return files;
}

function fileCoverage(
  file: string,
  lines: ReadonlySet<number>,
  hits: ReadonlyMap<number, number>,
): FileDiffCoverage {
  const instrumented = [...lines].filter((line) => hits.has(line)).sort((a, b) => a - b);
  const uncovered = instrumented.filter((line) => hits.get(line) === 0);
  return {
    file,
    covered: instrumented.length - uncovered.length,
    total: instrumented.length,
    uncovered,
  };
}

/** Intersects the added lines with the instrumented ones. */
export function computeDiffCoverage(
  added: ReadonlyMap<string, ReadonlySet<number>>,
  lcov: ReadonlyMap<string, ReadonlyMap<number, number>>,
): DiffCoverage {
  const files = [...added.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, lines]) => fileCoverage(file, lines, lcov.get(file) ?? new Map<number, number>()))
    .filter((entry) => entry.total > 0);
  const covered = files.reduce((sum, entry) => sum + entry.covered, 0);
  const total = files.reduce((sum, entry) => sum + entry.total, 0);
  return { covered, total, files };
}

/** Percentage of covered new lines; 100 when no new line is instrumented. */
export function coveragePercent(coverage: DiffCoverage): number {
  return coverage.total === 0 ? 100 : (coverage.covered * 100) / coverage.total;
}

/** `[1, 2, 3, 5]` → `"1-3, 5"`. */
export function formatRanges(lines: readonly number[]): string {
  const ranges: [number, number][] = [];
  for (const line of lines) {
    const last = ranges.at(-1);
    if (last !== undefined && last[1] + 1 === line) {
      last[1] = line;
    } else {
      ranges.push([line, line]);
    }
  }
  return ranges
    .map(([from, to]) => (from === to ? String(from) : `${String(from)}-${String(to)}`))
    .join(", ");
}

/** Truncated, so a failing value is never shown as the minimum. */
function shownPercent(coverage: DiffCoverage): string {
  return (Math.floor(coveragePercent(coverage) * 100) / 100).toFixed(2);
}

function formatSummary(coverage: DiffCoverage, base: string): string {
  const rows = coverage.files.map(
    (entry) =>
      `| \`${entry.file}\` | ${String(entry.covered)}/${String(entry.total)} | ${formatRanges(entry.uncovered) || "—"} |`,
  );
  return [
    "### Cobertura das linhas novas",
    "",
    `**${shownPercent(coverage)}%** das linhas novas instrumentadas estão cobertas (${String(coverage.covered)} de ${String(coverage.total)}; mínimo ${String(NEW_LINES_COVERAGE_MIN)}%; base \`${base}\`).`,
    "",
    "| Arquivo | Cobertas | Linhas sem cobertura |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

/** The added lines, with every instrumented line of the untracked files. */
function newLines(
  changes: Changes,
  lcov: ReadonlyMap<string, ReadonlyMap<number, number>>,
): Map<string, Set<number>> {
  const untracked = changes.untracked.map(
    (file) => [file, new Set(lcov.get(file)?.keys())] as const,
  );
  return new Map([...parseAddedLines(changes.diff), ...untracked]);
}

function parseOptions(argv: readonly string[]): Result<{ base: string; lcov: string }> {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: {
        base: { type: "string", default: "origin/main" },
        lcov: { type: "string", default: "coverage/lcov.info" },
      },
    });
    return { ok: true, value: values };
  } catch {
    return {
      ok: false,
      error:
        "opção inválida — Solução: use node scripts/diff-coverage.ts [--base <ref>] [--lcov <arquivo>].",
    };
  }
}

/** Runs the gate; returns the process exit code. */
export function main(argv: readonly string[], io: DiffCoverageIo, root: string): number {
  const options = parseOptions(argv);
  if (!options.ok) {
    io.log(`Erro: ${options.error}`);
    return 2;
  }
  const { base, lcov: lcovPath } = options.value;
  const changes = changesSince(io.git, base, DIFF_ARGS);
  const lcovText = io.readText(lcovPath);
  if (!changes.ok || lcovText === undefined) {
    io.log(
      `Erro: ${changes.ok ? `${lcovPath} não existe — Solução: rode npm run coverage antes.` : changes.error}`,
    );
    return 1;
  }
  const lcov = parseLcov(lcovText, root);
  const coverage = computeDiffCoverage(newLines(changes.value, lcov), lcov);
  const summary = formatSummary(coverage, base);
  io.log(summary);
  io.appendSummary(summary);
  const percent = shownPercent(coverage);
  if (coverage.covered * 100 < NEW_LINES_COVERAGE_MIN * coverage.total) {
    io.log(
      `Erro: só ${percent}% das linhas novas estão cobertas (mínimo ${String(NEW_LINES_COVERAGE_MIN)}%) — Solução: escreva testes para as linhas listadas acima.`,
    );
    return 1;
  }
  io.log(
    `Cobertura das linhas novas: ${percent}% (${String(coverage.covered)} de ${String(coverage.total)}; mínimo ${String(NEW_LINES_COVERAGE_MIN)}%).`,
  );
  return 0;
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run coverage:diff` */
if (import.meta.main) {
  const root = process.cwd();
  process.exitCode = main(
    process.argv.slice(2),
    {
      git: (args) => runGit(args, root),
      readText: readTextFile,
      appendSummary: (markdown) => appendStepSummary(markdown, process.env["GITHUB_STEP_SUMMARY"]),
      log: console.log,
    },
    root,
  );
}
/* v8 ignore stop -- @preserve */
