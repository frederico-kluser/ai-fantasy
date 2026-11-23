/**
 * Incremental mutation testing (testing-strategy §12): runs Stryker only on the
 * production code that changed since the merge base with `origin/main`
 * (committed, uncommitted and untracked), one run per package, from the package
 * folder, with `--mutate`.
 *
 * Every changed JavaScript/TypeScript file must either be production code of a
 * package with a `stryker.config.mjs` or match one of the documented exemptions
 * in {@link NOT_MUTATED}; anything else fails, so no code escapes mutation by
 * accident.
 *
 * Usage: `npm run mutation:changed [-- --base <ref>]`. Nothing to mutate → exit 0.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { changesSince } from "./lib/changes.ts";
import { runGit, runNode, type GitResult } from "./lib/io.ts";
import type { Result } from "./lib/result.ts";

/** What {@link main} needs from the outside world. */
export interface MutationIo {
  readonly git: (args: readonly string[]) => GitResult;
  readonly hasStrykerConfig: (packageDir: string) => boolean;
  /** Runs Stryker in `packageDir` on `files` (relative to it); resolves the exit code. */
  readonly runStryker: (packageDir: string, files: readonly string[]) => Promise<number>;
  readonly log: (line: string) => void;
}

/** The files to mutate per package and the code that would escape mutation. */
export interface MutationPlan {
  readonly targets: Map<string, string[]>;
  readonly uncovered: readonly string[];
}

/**
 * Code that never goes through mutation testing, and why (testing-strategy §12).
 * Paths are repository-relative with forward slashes.
 */
export const NOT_MUTATED: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /\.(test|spec)\.[cm]?[jt]sx?$/, reason: "tests: they are what kills the mutants" },
  { pattern: /\.d\.[cm]?ts$/, reason: "type declarations: no code runs" },
  { pattern: /^scripts\//, reason: "gate scripts: covered by the scripts test project" },
  {
    pattern: /^(packages|apps)\/[^/]+\/(test|e2e|bench)\//,
    reason: "test support, E2E specs and the benchmark",
  },
  {
    pattern: /(^|\/)[^/]+\.config\.[cm]?[jt]s$/,
    reason: "tool configuration (Vite, Vitest, ESLint…)",
  },
  { pattern: /(^|\/)vitest\.setup\.[cm]?[jt]s$/, reason: "test setup" },
  { pattern: /^stryker\.base\.mjs$/, reason: "shared Stryker configuration" },
];

const CODE_FILE = /\.[cm]?[jt]sx?$/;
const PACKAGE_SOURCE = /^((?:packages|apps)\/[^/]+)\/(src\/.+)$/;

function isExempt(file: string): boolean {
  return NOT_MUTATED.some((entry) => entry.pattern.test(file));
}

/** Sorts the changed code into mutation targets per package and uncovered files. */
export function planMutation(
  files: readonly string[],
  hasStrykerConfig: (packageDir: string) => boolean,
): MutationPlan {
  const targets = new Map<string, string[]>();
  const uncovered: string[] = [];
  const code = [...new Set(files)].filter((file) => CODE_FILE.test(file) && !isExempt(file));
  for (const file of code.sort()) {
    const [, packageDir, path] = PACKAGE_SOURCE.exec(file) ?? [];
    if (packageDir !== undefined && path !== undefined && hasStrykerConfig(packageDir)) {
      targets.set(packageDir, [...(targets.get(packageDir) ?? []), path]);
    } else {
      uncovered.push(file);
    }
  }
  return { targets: new Map([...targets].sort(([a], [b]) => a.localeCompare(b))), uncovered };
}

function parseOptions(argv: readonly string[]): Result<{ base: string }> {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: { base: { type: "string", default: "origin/main" } },
    });
    return { ok: true, value: values };
  } catch {
    return {
      ok: false,
      error: "opção inválida — Solução: use node scripts/mutation-changed.ts [--base <ref>].",
    };
  }
}

async function runAll(io: MutationIo, targets: ReadonlyMap<string, string[]>): Promise<string[]> {
  const failed: string[] = [];
  for (const [packageDir, files] of targets) {
    io.log(`Mutação em ${packageDir}: ${files.join(", ")}`);
    const code = await io.runStryker(packageDir, files);
    if (code !== 0) {
      failed.push(packageDir);
    }
  }
  return failed;
}

function reportUncovered(io: MutationIo, uncovered: readonly string[]): void {
  io.log(
    "Erro: código fora da mutação — Solução: mova-o para <pacote>/src de um pacote com stryker.config.mjs ou, se não for código de produção, registre o caminho e o motivo em NOT_MUTATED (scripts/mutation-changed.ts) e na testing-strategy §12.",
  );
  for (const file of uncovered) {
    io.log(`  - ${file}`);
  }
}

/** Runs the gate; resolves the process exit code. */
export async function main(argv: readonly string[], io: MutationIo): Promise<number> {
  const options = parseOptions(argv);
  if (!options.ok) {
    io.log(`Erro: ${options.error}`);
    return 2;
  }
  const { base } = options.value;
  const changes = changesSince(io.git, base, ["diff", "--name-only", "--diff-filter=d"]);
  if (!changes.ok) {
    io.log(`Erro: ${changes.error}`);
    return 1;
  }
  const changed = [...changes.value.diff.split("\n"), ...changes.value.untracked];
  const plan = planMutation(changed, io.hasStrykerConfig);
  if (plan.uncovered.length > 0) {
    reportUncovered(io, plan.uncovered);
    return 1;
  }
  if (plan.targets.size === 0) {
    io.log(
      `Nenhum código de produção mudou desde ${base}: a mutação incremental não tem o que testar.`,
    );
    return 0;
  }
  const failed = await runAll(io, plan.targets);
  if (failed.length > 0) {
    io.log(
      `Erro: a mutação falhou em ${failed.join(", ")} — Solução: veja os mutantes sobreviventes em <pacote>/reports/mutation/index.html e escreva os testes que os matam.`,
    );
    return 1;
  }
  return 0;
}

/** The real outside world, from the repository root. */
export function defaultIo(
  root: string,
  strykerBin: string = join(root, "node_modules", "@stryker-mutator", "core", "bin", "stryker.js"),
): MutationIo {
  return {
    git: (args) => runGit(args, root),
    hasStrykerConfig: (packageDir) => existsSync(join(root, packageDir, "stryker.config.mjs")),
    runStryker: (packageDir, files) =>
      runNode(strykerBin, ["run", "--mutate", files.join(",")], join(root, packageDir)),
    log: (line) => {
      console.log(line);
    },
  };
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run mutation:changed` */
if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2), defaultIo(process.cwd()));
}
/* v8 ignore stop -- @preserve */
