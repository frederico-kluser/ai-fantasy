import { describe, expect, it } from "vitest";

import type { GitResult } from "./lib/io.ts";
import { main, mutationTargets, type MutationIo } from "./mutation-changed.ts";

interface FakeRun {
  readonly code: number;
  readonly lines: string[];
  readonly runs: string[];
}

const GIT_BASE = {
  "merge-base origin/main HEAD": { ok: true, output: "abc123\n" },
  "ls-files --others --exclude-standard": { ok: true, output: "" },
};

function gitWith(
  changed: string,
  extra: Record<string, GitResult> = {},
): Record<string, GitResult> {
  return {
    ...GIT_BASE,
    "diff --name-only --diff-filter=d abc123": { ok: true, output: changed },
    ...extra,
  };
}

async function runMain(options: {
  argv?: string[];
  git: Record<string, GitResult>;
  failing?: string[];
  withoutConfig?: string[];
}): Promise<FakeRun> {
  const lines: string[] = [];
  const runs: string[] = [];
  const git = new Map(Object.entries(options.git));
  const failing = new Set(options.failing ?? []);
  const withoutConfig = new Set(options.withoutConfig ?? []);
  const io: MutationIo = {
    git: (args) =>
      git.get(args.join(" ")) ?? { ok: false, output: `unexpected: git ${args.join(" ")}` },
    hasStrykerConfig: (packageDir) => !withoutConfig.has(packageDir),
    runStryker: (packageDir, files) => {
      runs.push(`${packageDir}: ${files.join(",")}`);
      return Promise.resolve(Number(failing.has(packageDir)));
    },
    log: (line) => lines.push(line),
  };
  const code = await main(options.argv ?? [], io);
  return { code, lines, runs };
}

describe("files to mutate (stryker.base.mjs)", () => {
  it("given production files of two packages when selecting then they are grouped per package and relative to it", () => {
    const targets = mutationTargets([
      "packages/engine/src/rng/draw.ts",
      "apps/web/src/App.tsx",
      "packages/engine/src/domain/math.ts",
    ]);

    expect(targets).toEqual(
      new Map([
        ["apps/web", ["src/App.tsx"]],
        ["packages/engine", ["src/domain/math.ts", "src/rng/draw.ts"]],
      ]),
    );
  });

  it("given tests, declarations, barrels and files outside src when selecting then they are left out", () => {
    const targets = mutationTargets([
      "packages/engine/src/rng/draw.test.ts",
      "apps/web/src/App.test.tsx",
      "packages/ai/src/types.d.ts",
      "packages/ai/src/index.ts",
      "packages/ai/src/openrouter/index.ts",
      "packages/engine/bench/run.ts",
      "packages/engine/vitest.config.ts",
      "scripts/diff-coverage.ts",
      "apps/web/src/styles.css",
      "docs/product.md",
    ]);

    expect(targets).toEqual(new Map());
  });
});

describe("command line", () => {
  it("given no production file changed when running then it exits with 0 without running Stryker", async () => {
    const run = await runMain({ git: gitWith("docs/product.md\nscripts/dev.ts\n") });

    expect(run).toEqual({
      code: 0,
      lines: [
        "Nenhum arquivo de produção de packages/*/src ou apps/*/src mudou desde origin/main: a mutação incremental não tem o que testar.",
      ],
      runs: [],
    });
  });

  it("given changed and untracked production files when running then Stryker mutates them per package", async () => {
    const run = await runMain({
      git: gitWith("packages/engine/src/meta.ts\napps/server/src/env.ts\n", {
        "ls-files --others --exclude-standard": { ok: true, output: "apps/server/src/new.ts\n" },
      }),
    });

    expect({ code: run.code, runs: run.runs }).toEqual({
      code: 0,
      runs: ["apps/server: src/env.ts,src/new.ts", "packages/engine: src/meta.ts"],
    });
  });

  it("given Stryker failing in one package when running then it exits with 1 and names the package", async () => {
    const run = await runMain({
      git: gitWith("packages/engine/src/meta.ts\napps/server/src/env.ts\n"),
      failing: ["packages/engine"],
    });

    expect({ code: run.code, last: run.lines.at(-1), runs: run.runs.length }).toEqual({
      code: 1,
      last: "Erro: a mutação falhou em packages/engine — Solução: veja os mutantes sobreviventes em <pacote>/reports/mutation/index.html e escreva os testes que os matam.",
      runs: 2,
    });
  });

  it("given a package without a Stryker config when running then it is skipped with a warning", async () => {
    const run = await runMain({
      git: gitWith("apps/tools/src/x.ts\n"),
      withoutConfig: ["apps/tools"],
    });

    expect(run).toEqual({
      code: 0,
      lines: ["Aviso: apps/tools não tem stryker.config.mjs; os arquivos dele não são mutados."],
      runs: [],
    });
  });

  it("given another base when running then it is used", async () => {
    const run = await runMain({
      argv: ["--base", "origin/release"],
      git: gitWith("packages/ai/src/roles.ts\n", {
        "merge-base origin/release HEAD": { ok: true, output: "abc123\n" },
      }),
    });

    expect(run.runs).toEqual(["packages/ai: src/roles.ts"]);
  });

  it("given a base that does not exist when running then it fails and says how to fetch it", async () => {
    const run = await runMain({ git: {} });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 1,
      lines: [
        "Erro: não foi possível achar a base origin/main (unexpected: git merge-base origin/main HEAD) — Solução: git fetch origin main, ou passe --base <ref>.",
      ],
    });
  });

  it("given git failing to list the changes when running then it fails with git's message", async () => {
    const run = await runMain({ git: GIT_BASE });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 1,
      lines: [
        "Erro: git falhou (unexpected: git diff --name-only --diff-filter=d abc123) — Solução: rode na raiz de um clone com o histórico completo.",
      ],
    });
  });

  it("given an unknown option when running then it fails with the usage", async () => {
    const run = await runMain({ argv: ["--all"], git: GIT_BASE });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 2,
      lines: [
        "Erro: opção inválida — Solução: use node scripts/mutation-changed.ts [--base <ref>].",
      ],
    });
  });
});
