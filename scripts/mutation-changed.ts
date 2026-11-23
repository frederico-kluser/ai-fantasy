/**
 * Incremental mutation testing (testing-strategy §12): runs Stryker only on the
 * production files of `packages/*\/src` and `apps/*\/src` that changed since the
 * merge base with `origin/main` (committed, uncommitted and untracked), one run
 * per package, from the package folder, with `--mutate`.
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

/** Same selection as the `mutate` globs of `stryker.base.mjs`. */
const PRODUCTION_FILE = /^((?:packages|apps)\/[^/]+)\/(src\/.+\.tsx?)$/;
const NOT_MUTATED = /(\.test\.tsx?|\.d\.ts|(^|\/)index\.ts)$/;

/** Groups the files Stryker would mutate by package folder, relative to it. */
export function mutationTargets(files: readonly string[]): Map<string, string[]> {
  const targets = new Map<string, string[]>();
  for (const file of [...files].sort()) {
    const [, packageDir, path] = PRODUCTION_FILE.exec(file) ?? [];
    if (packageDir !== undefined && path !== undefined && !NOT_MUTATED.test(path)) {
      targets.set(packageDir, [...(targets.get(packageDir) ?? []), path]);
    }
  }
  return new Map([...targets].sort(([a], [b]) => a.localeCompare(b)));
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

function configuredTargets(io: MutationIo, files: readonly string[]): [string, string[]][] {
  return [...mutationTargets(files)].filter(([packageDir]) => {
    const configured = io.hasStrykerConfig(packageDir);
    if (!configured) {
      io.log(`Aviso: ${packageDir} não tem stryker.config.mjs; os arquivos dele não são mutados.`);
    }
    return configured;
  });
}

async function runAll(io: MutationIo, targets: readonly [string, string[]][]): Promise<string[]> {
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
  const targets = configuredTargets(io, changed);
  if (mutationTargets(changed).size === 0) {
    io.log(
      `Nenhum arquivo de produção de packages/*/src ou apps/*/src mudou desde ${base}: a mutação incremental não tem o que testar.`,
    );
    return 0;
  }
  const failed = await runAll(io, targets);
  if (failed.length > 0) {
    io.log(
      `Erro: a mutação falhou em ${failed.join(", ")} — Solução: veja os mutantes sobreviventes em <pacote>/reports/mutation/index.html e escreva os testes que os matam.`,
    );
    return 1;
  }
  return 0;
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run mutation:changed` */
if (import.meta.main) {
  const root = process.cwd();
  const stryker = join(root, "node_modules", "@stryker-mutator", "core", "bin", "stryker.js");
  process.exitCode = await main(process.argv.slice(2), {
    git: (args) => runGit(args, root),
    hasStrykerConfig: (packageDir) => existsSync(join(root, packageDir, "stryker.config.mjs")),
    runStryker: (packageDir, files) =>
      runNode(stryker, ["run", "--mutate", files.join(",")], join(root, packageDir)),
    log: console.log,
  });
}
/* v8 ignore stop -- @preserve */
