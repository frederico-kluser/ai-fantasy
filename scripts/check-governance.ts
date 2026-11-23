/**
 * Minimum governance (the "Governança mínima" step of the CI `docs` job): the
 * required project files exist and are not empty, and AGENTS.md mirrors
 * CLAUDE.md (only the first line may differ). The CI and `npm run check` run this
 * same script.
 *
 * Usage: `npm run governance` (exit 1 when something is missing or diverges).
 */
import { resolve } from "node:path";

import { readTextFile } from "./lib/io.ts";

/** Files every change must keep (CI `docs` job). */
export const REQUIRED_FILES: readonly string[] = [
  "LICENSE",
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODEOWNERS",
  "CODE_OF_CONDUCT.md",
  "CLAUDE.md",
  "AGENTS.md",
  "GOVERNANCE.md",
  "docs/architecture/overview.md",
  "docs/engineering/development-rules.md",
  "docs/engineering/testing-strategy.md",
];

/** What {@link main} needs from the outside world. */
export interface GovernanceIo {
  /** Contents of a repository-relative text file, or `undefined` when it does not exist. */
  readonly readText: (path: string) => string | undefined;
  readonly log: (line: string) => void;
}

/**
 * Compares two contracts from their second line on (the title may differ).
 *
 * @returns the 1-based number of the first line that differs, or `undefined` for mirrors.
 */
export function mirrorDifference(claude: string, agents: string): number | undefined {
  const left = claude.split("\n");
  const right = agents.split("\n");
  const length = Math.max(left.length, right.length);
  const index = Array.from({ length }, (_, at) => at).find(
    (at) => at > 0 && left[at] !== right[at],
  );
  return index === undefined ? undefined : index + 1;
}

function problems(io: GovernanceIo): string[] {
  const missing = REQUIRED_FILES.filter((file) => (io.readText(file) ?? "").trim() === "").map(
    (file) => `falta ou está vazio: ${file}`,
  );
  const line = mirrorDifference(io.readText("CLAUDE.md") ?? "", io.readText("AGENTS.md") ?? "");
  const mirror =
    line === undefined ? [] : [`CLAUDE.md e AGENTS.md divergem a partir da linha ${String(line)}`];
  return [...missing, ...mirror];
}

/** Runs the check; returns the process exit code. */
export function main(_argv: readonly string[], io: GovernanceIo): number {
  const found = problems(io);
  if (found.length > 0) {
    io.log(
      "Erro: governança mínima incompleta — Solução: restaure os arquivos e alinhe CLAUDE.md e AGENTS.md (só a primeira linha pode diferir).",
    );
    for (const problem of found) {
      io.log(`  - ${problem}`);
    }
    return 1;
  }
  io.log(
    `Governança mínima: ${String(REQUIRED_FILES.length)} arquivos obrigatórios presentes; CLAUDE.md e AGENTS.md espelhados.`,
  );
  return 0;
}

/** The real outside world, from the repository root. */
export function defaultIo(root: string): GovernanceIo {
  return {
    readText: (path) => readTextFile(resolve(root, path)),
    log: (line) => {
      console.log(line);
    },
  };
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run governance` */
if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2), defaultIo(process.cwd()));
}
/* v8 ignore stop -- @preserve */
