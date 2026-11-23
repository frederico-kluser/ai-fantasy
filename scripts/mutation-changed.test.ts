import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it, onTestFinished, vi } from "vitest";

import type { GitResult } from "./lib/io.ts";
import { defaultIo, main, NOT_MUTATED, planMutation, type MutationIo } from "./mutation-changed.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-mutation-"));
const CONFIGURED = new Set(["packages/engine", "packages/ai", "apps/server", "apps/web"]);

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

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
}): Promise<FakeRun> {
  const lines: string[] = [];
  const runs: string[] = [];
  const git = new Map(Object.entries(options.git));
  const failing = new Set(options.failing ?? []);
  const io: MutationIo = {
    git: (args) =>
      git.get(args.join(" ")) ?? { ok: false, output: `unexpected: git ${args.join(" ")}` },
    hasStrykerConfig: (packageDir) => CONFIGURED.has(packageDir),
    runStryker: (packageDir, files) => {
      runs.push(`${packageDir}: ${files.join(",")}`);
      return Promise.resolve(Number(failing.has(packageDir)));
    },
    log: (line) => lines.push(line),
  };
  const code = await main(options.argv ?? [], io);
  return { code, lines, runs };
}

function plan(files: string[]): ReturnType<typeof planMutation> {
  return planMutation(files, (packageDir) => CONFIGURED.has(packageDir));
}

describe("what is mutated (testing-strategy §12)", () => {
  it("given production files of two packages when planning then they are grouped per package and relative to it", () => {
    expect(
      plan([
        "packages/engine/src/rng/draw.ts",
        "apps/web/src/App.tsx",
        "packages/engine/src/domain/math.ts",
      ]),
    ).toEqual({
      targets: new Map([
        ["apps/web", ["src/App.tsx"]],
        ["packages/engine", ["src/domain/math.ts", "src/rng/draw.ts"]],
      ]),
      uncovered: [],
    });
  });

  it("given index.ts barrels when planning then they are mutated like any production file", () => {
    expect(plan(["packages/ai/src/openrouter/index.ts", "packages/engine/src/index.ts"])).toEqual({
      targets: new Map([
        ["packages/ai", ["src/openrouter/index.ts"]],
        ["packages/engine", ["src/index.ts"]],
      ]),
      uncovered: [],
    });
  });

  it.each([
    ["a unit test", "packages/engine/src/rng/draw.test.ts"],
    ["a component test", "apps/web/src/App.test.tsx"],
    ["a type declaration", "packages/ai/src/types.d.ts"],
    ["a gate script", "scripts/diff-coverage.ts"],
    ["a gate script helper", "scripts/lib/io.ts"],
    ["an engine test helper", "packages/engine/test/helpers/cast.ts"],
    ["an E2E spec", "apps/web/e2e/smoke.spec.ts"],
    ["the benchmark", "packages/engine/bench/run.ts"],
    ["a package tool config", "packages/engine/vitest.config.ts"],
    ["the Vite config", "apps/web/vite.config.ts"],
    ["a Stryker config", "apps/server/stryker.config.mjs"],
    ["a test setup", "apps/web/vitest.setup.ts"],
    ["a root tool config", "eslint.config.js"],
    ["the shared Stryker config", "stryker.base.mjs"],
  ])(
    "given %s when planning then it is a documented exemption and nothing is mutated",
    (_kind, file) => {
      expect(plan([file])).toEqual({ targets: new Map(), uncovered: [] });
    },
  );

  it.each([
    "docs/product.md",
    "apps/web/src/styles.css",
    "apps/web/index.html",
    "package.json",
    ".github/workflows/ci.yml",
  ])("given the non-code file %s when planning then it is ignored", (file) => {
    expect(plan([file])).toEqual({ targets: new Map(), uncovered: [] });
  });

  it("given production modules named like tool configs inside src when planning then they are mutated", () => {
    expect(
      plan([
        "apps/server/src/ai.config.ts",
        "packages/engine/src/presets/catalog.config.ts",
        "packages/engine/src/vitest.setup.ts",
      ]),
    ).toEqual({
      targets: new Map([
        ["apps/server", ["src/ai.config.ts"]],
        ["packages/engine", ["src/presets/catalog.config.ts", "src/vitest.setup.ts"]],
      ]),
      uncovered: [],
    });
  });

  it("given a config file in a nested folder outside src when planning then it is uncovered", () => {
    expect(plan(["packages/engine/tools/build.config.ts"])).toEqual({
      targets: new Map(),
      uncovered: ["packages/engine/tools/build.config.ts"],
    });
  });

  it("given code of a package without a Stryker config when planning then it is uncovered", () => {
    expect(plan(["apps/tools/src/x.ts"])).toEqual({
      targets: new Map(),
      uncovered: ["apps/tools/src/x.ts"],
    });
  });

  it("given code outside src and outside the exemptions when planning then it is uncovered", () => {
    expect(
      plan(["packages/engine/fixtures/data.ts", "tools/release.ts", "packages/engine/index.mjs"]),
    ).toEqual({
      targets: new Map(),
      uncovered: [
        "packages/engine/fixtures/data.ts",
        "packages/engine/index.mjs",
        "tools/release.ts",
      ],
    });
  });

  it("given the list of exemptions when reading it then every entry says why", () => {
    expect(NOT_MUTATED.filter((entry) => entry.reason.trim() === "")).toEqual([]);
  });
});

describe("command line", () => {
  it("given no production code changed when running then it exits with 0 without running Stryker", async () => {
    const run = await runMain({ git: gitWith("docs/product.md\nscripts/dev.ts\n") });

    expect(run).toEqual({
      code: 0,
      lines: [
        "Nenhum código de produção mudou desde origin/main: a mutação incremental não tem o que testar.",
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

  it("given code that would escape mutation when running then it exits with 1, lists it and runs nothing", async () => {
    const run = await runMain({
      git: gitWith("apps/tools/src/x.ts\npackages/engine/src/meta.ts\n"),
    });

    expect(run).toEqual({
      code: 1,
      lines: [
        "Erro: código fora da mutação — Solução: mova-o para <pacote>/src de um pacote com stryker.config.mjs ou, se não for código de produção, registre o caminho e o motivo em NOT_MUTATED (scripts/mutation-changed.ts) e na testing-strategy §12.",
        "  - apps/tools/src/x.ts",
      ],
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

describe("default wiring", () => {
  it("given the repository when asking git through the default io then it runs in the root", () => {
    expect(defaultIo(repoRoot).git(["rev-parse", "--is-inside-work-tree"])).toEqual({
      ok: true,
      output: "true\n",
    });
  });

  it("given the packages when looking for Stryker configs then only packages with one are found", () => {
    const io = defaultIo(repoRoot);

    expect([io.hasStrykerConfig("packages/engine"), io.hasStrykerConfig("scripts")]).toEqual([
      true,
      false,
    ]);
  });

  it("given files to mutate when running Stryker through the default io then it runs in the package with --mutate", async () => {
    const out = join(scratch, "stryker-args.json");
    const fakeStryker = join(scratch, "fake-stryker.mjs");
    writeFileSync(
      fakeStryker,
      [
        'import { writeFileSync } from "node:fs";',
        `writeFileSync(${JSON.stringify(out)}, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));`,
      ].join("\n"),
    );

    const code = await defaultIo(repoRoot, fakeStryker).runStryker("packages/engine", [
      "src/a.ts",
      "src/b.ts",
    ]);

    expect({ code, call: JSON.parse(readFileSync(out, "utf8")) as unknown }).toEqual({
      code: 0,
      call: {
        args: ["run", "--mutate", "src/a.ts,src/b.ts"],
        cwd: join(repoRoot, "packages", "engine"),
      },
    });
  });

  it("given a line to log when using the default io then it goes to the console", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    onTestFinished(() => {
      log.mockRestore();
    });

    defaultIo(repoRoot).log("mutation line");

    expect(log.mock.calls).toEqual([["mutation line"]]);
  });
});
