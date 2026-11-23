import { describe, expect, it } from "vitest";

import {
  computeDiffCoverage,
  coveragePercent,
  formatRanges,
  main,
  parseAddedLines,
  parseLcov,
  type DiffCoverageIo,
} from "./diff-coverage.ts";
import type { GitResult } from "./lib/io.ts";

const ROOT = "C:/work/ai-fantasy";

const DIFF_TWO_FILES = `diff --git a/apps/server/src/a.ts b/apps/server/src/a.ts
index 1111111..2222222 100644
--- a/apps/server/src/a.ts
+++ b/apps/server/src/a.ts
@@ -3,0 +4,2 @@ export function a() {
+  const x = 1;
+  return x;
@@ -10 +12 @@ export function b() {
-  return 1;
+  return 2;
diff --git a/apps/server/src/b.ts b/apps/server/src/b.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/apps/server/src/b.ts
@@ -0,0 +1,3 @@
+export const b = 1;
+// a comment
+export const c = 2;
`;

const LCOV = `TN:
SF:${ROOT}/apps/server/src/a.ts
DA:4,1
DA:5,0
DA:12,3
end_of_record
TN:
SF:${ROOT.replaceAll("/", "\\")}\\apps\\server\\src\\b.ts
DA:1,1
DA:3,1
end_of_record
`;

function lcovMap(
  entries: Record<string, Record<number, number>>,
): Map<string, Map<number, number>> {
  return new Map(
    Object.entries(entries).map(([file, lines]) => [
      file,
      new Map(Object.entries(lines).map(([line, hits]) => [Number(line), hits])),
    ]),
  );
}

function addedMap(entries: Record<string, number[]>): Map<string, Set<number>> {
  return new Map(Object.entries(entries).map(([file, lines]) => [file, new Set(lines)]));
}

interface FakeRun {
  readonly code: number;
  readonly lines: string[];
  readonly summaries: string[];
}

function runMain(options: {
  argv?: string[];
  git?: Record<string, GitResult>;
  lcov?: string | undefined;
}): FakeRun {
  const lines: string[] = [];
  const summaries: string[] = [];
  const git = new Map(Object.entries(options.git ?? {}));
  const files = new Map([["coverage/lcov.info", options.lcov]]);
  const io: DiffCoverageIo = {
    git: (args) =>
      git.get(args.join(" ")) ?? { ok: false, output: `unexpected: git ${args.join(" ")}` },
    readText: (path) => files.get(path),
    appendSummary: (text) => summaries.push(text),
    log: (line) => lines.push(line),
  };
  const code = main(options.argv ?? [], io, ROOT);
  return { code, lines, summaries };
}

const GIT_OK = {
  "merge-base origin/main HEAD": { ok: true, output: "abc123\n" },
  "diff -U0 --no-color --no-ext-diff --find-renames abc123": { ok: true, output: DIFF_TWO_FILES },
  "ls-files --others --exclude-standard": { ok: true, output: "" },
};

describe("added lines of a diff", () => {
  it("given a diff adding and replacing lines when parsing then the new line numbers are listed per file", () => {
    expect(parseAddedLines(DIFF_TWO_FILES)).toEqual(
      addedMap({ "apps/server/src/a.ts": [4, 5, 12], "apps/server/src/b.ts": [1, 2, 3] }),
    );
  });

  it("given a deleted file when parsing then it adds nothing", () => {
    const diff =
      "diff --git a/old.ts b/old.ts\ndeleted file mode 100644\n--- a/old.ts\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-const a = 1;\n-const b = 2;\n";

    expect(parseAddedLines(diff)).toEqual(new Map());
  });

  it("given an added line that starts with ++ when parsing then it is an addition and not a header", () => {
    const diff = "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -1,0 +2,1 @@\n+++counter;\n";

    expect(parseAddedLines(diff)).toEqual(addedMap({ "x.ts": [2] }));
  });

  it("given context lines and a missing newline marker when parsing then line numbers still advance correctly", () => {
    const diff =
      "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -1,3 +1,3 @@\n const a = 1;\n-const b = 2;\n+const b = 3;\n const c = 4;\n\\ No newline at end of file\n";

    expect(parseAddedLines(diff)).toEqual(addedMap({ "x.ts": [2] }));
  });
});

describe("lcov", () => {
  it("given absolute paths under the root when parsing then they become repository-relative with their hits", () => {
    expect(parseLcov(LCOV, ROOT)).toEqual(
      lcovMap({
        "apps/server/src/a.ts": { 4: 1, 5: 0, 12: 3 },
        "apps/server/src/b.ts": { 1: 1, 3: 1 },
      }),
    );
  });

  it("given relative paths and repeated records when parsing then paths are kept and the highest hit count wins", () => {
    const lcov =
      "SF:scripts/x.ts\nDA:1,0\nend_of_record\nSF:scripts/x.ts\nDA:1,2\nDA:2,0,checksum\nend_of_record\n";

    expect(parseLcov(lcov, ROOT)).toEqual(lcovMap({ "scripts/x.ts": { 1: 2, 2: 0 } }));
  });
});

describe("coverage of the new lines", () => {
  it("given new lines partly covered when computing then covered, total and uncovered lines are reported", () => {
    const coverage = computeDiffCoverage(
      addedMap({ "apps/server/src/a.ts": [4, 5, 12], "apps/server/src/b.ts": [1, 2, 3] }),
      parseLcov(LCOV, ROOT),
    );

    expect(coverage).toEqual({
      covered: 4,
      total: 5,
      files: [
        { file: "apps/server/src/a.ts", covered: 2, total: 3, uncovered: [5] },
        { file: "apps/server/src/b.ts", covered: 2, total: 2, uncovered: [] },
      ],
    });
  });

  it("given new lines that are not instrumented when computing then they are ignored", () => {
    const coverage = computeDiffCoverage(
      addedMap({ "docs/x.md": [1, 2], "apps/server/src/a.test.ts": [1] }),
      parseLcov(LCOV, ROOT),
    );

    expect(coverage).toEqual({ covered: 0, total: 0, files: [] });
  });

  it("given no instrumented new line when computing the percentage then it is 100", () => {
    expect(coveragePercent({ covered: 0, total: 0, files: [] })).toBe(100);
  });

  it("given 4 of 5 lines covered when computing the percentage then it is 80", () => {
    expect(coveragePercent({ covered: 4, total: 5, files: [] })).toBe(80);
  });

  it("given scattered line numbers when formatting then consecutive lines become ranges", () => {
    expect(formatRanges([1, 2, 3, 5, 7, 8])).toBe("1-3, 5, 7-8");
  });
});

describe("command line", () => {
  it("given a change whose new lines are below 95% coverage when running the diff coverage step then it fails", () => {
    const run = runMain({ git: GIT_OK, lcov: LCOV });

    expect({ code: run.code, last: run.lines.at(-1) }).toEqual({
      code: 1,
      last: "Erro: só 80.00% das linhas novas estão cobertas (mínimo 95%) — Solução: escreva testes para as linhas listadas acima.",
    });
  });

  it("given a change below the minimum when running then the summary lists the uncovered lines", () => {
    const run = runMain({ git: GIT_OK, lcov: LCOV });

    expect(run.summaries).toEqual([
      [
        "### Cobertura das linhas novas",
        "",
        "**80.00%** das linhas novas instrumentadas estão cobertas (4 de 5; mínimo 95%; base `origin/main`).",
        "",
        "| Arquivo | Cobertas | Linhas sem cobertura |",
        "| --- | --- | --- |",
        "| `apps/server/src/a.ts` | 2/3 | 5 |",
        "| `apps/server/src/b.ts` | 2/2 | — |",
        "",
      ].join("\n"),
    ]);
  });

  it("given a change whose new lines are all covered when running then it passes", () => {
    const covered = LCOV.replace("DA:5,0", "DA:5,7");

    const run = runMain({ git: GIT_OK, lcov: covered });

    expect({ code: run.code, last: run.lines.at(-1) }).toEqual({
      code: 0,
      last: "Cobertura das linhas novas: 100.00% (5 de 5; mínimo 95%).",
    });
  });

  it("given new files that git does not track yet when running then all their instrumented lines count", () => {
    const run = runMain({
      git: {
        ...GIT_OK,
        "diff -U0 --no-color --no-ext-diff --find-renames abc123": { ok: true, output: "" },
        "ls-files --others --exclude-standard": { ok: true, output: "apps/server/src/a.ts\n" },
      },
      lcov: LCOV,
    });

    expect({ code: run.code, last: run.lines.at(-1) }).toEqual({
      code: 1,
      last: "Erro: só 66.66% das linhas novas estão cobertas (mínimo 95%) — Solução: escreva testes para as linhas listadas acima.",
    });
  });

  it("given another base when running then it is used for the merge base", () => {
    const run = runMain({
      argv: ["--base", "origin/release"],
      git: {
        ...GIT_OK,
        "merge-base origin/release HEAD": { ok: true, output: "abc123\n" },
      },
      lcov: LCOV.replace("DA:5,0", "DA:5,1"),
    });

    expect(run.code).toBe(0);
  });

  it("given a base that does not exist when running then it fails and says how to fetch it", () => {
    const run = runMain({ git: {}, lcov: LCOV });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 1,
      lines: [
        "Erro: não foi possível achar a base origin/main (unexpected: git merge-base origin/main HEAD) — Solução: git fetch origin main, ou passe --base <ref>.",
      ],
    });
  });

  it("given git diff failing when running then it fails with git's message", () => {
    const run = runMain({
      git: { "merge-base origin/main HEAD": GIT_OK["merge-base origin/main HEAD"] },
      lcov: LCOV,
    });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 1,
      lines: [
        "Erro: git falhou (unexpected: git diff -U0 --no-color --no-ext-diff --find-renames abc123) — Solução: rode na raiz de um clone com o histórico completo.",
      ],
    });
  });

  it("given no coverage report when running then it fails and says to run the coverage first", () => {
    const run = runMain({ git: GIT_OK, lcov: undefined });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 1,
      lines: ["Erro: coverage/lcov.info não existe — Solução: rode npm run coverage antes."],
    });
  });

  it("given an unknown option when running then it fails with the usage", () => {
    const run = runMain({ argv: ["--nope"], git: GIT_OK, lcov: LCOV });

    expect({ code: run.code, lines: run.lines }).toEqual({
      code: 2,
      lines: [
        "Erro: opção inválida — Solução: use node scripts/diff-coverage.ts [--base <ref>] [--lcov <arquivo>].",
      ],
    });
  });
});
