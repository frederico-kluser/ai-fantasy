import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { appendStepSummary, readTextFile, runGit, runNode } from "./io.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-io-"));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("reading text files", () => {
  it("given an existing file when reading then its contents are returned", () => {
    const file = join(scratch, "present.txt");
    writeFileSync(file, "contents");

    expect(readTextFile(file)).toBe("contents");
  });

  it("given a missing file when reading then nothing is returned", () => {
    expect(readTextFile(join(scratch, "missing.txt"))).toBeUndefined();
  });

  it("given a folder when reading then the error is raised", () => {
    expect(() => readTextFile(scratch)).toThrow();
  });
});

describe("running git", () => {
  it("given a git command that works when running then its output is returned", () => {
    const result = runGit(["rev-parse", "--is-inside-work-tree"], repoRoot);

    expect(result).toEqual({ ok: true, output: "true\n" });
  });

  it("given a git command that fails when running then the error output is returned", () => {
    const result = runGit(
      ["rev-parse", "--verify", "--quiet", "refs/heads/no-such-branch-here"],
      repoRoot,
    );

    expect(result).toEqual({ ok: false, output: "" });
  });

  it("given an unknown git command when running then it fails with git's message", () => {
    const result = runGit(["definitely-not-a-git-command"], repoRoot);

    expect(result).toMatchObject({
      ok: false,
      output: expect.stringContaining("definitely-not-a-git-command") as unknown,
    });
  });
});

describe("GitHub job summary", () => {
  it("given a summary file when appending then the Markdown is added to it", () => {
    const file = join(scratch, "summary.md");
    writeFileSync(file, "# Before\n");

    const written = appendStepSummary("### Added", file);

    expect({ written, contents: readFileSync(file, "utf8") }).toEqual({
      written: true,
      contents: "# Before\n### Added\n",
    });
  });

  it.each([undefined, ""])(
    "given no summary file (%j) when appending then nothing is written",
    (file) => {
      expect(appendStepSummary("### Added", file)).toBe(false);
    },
  );
});

describe("running Node.js scripts", () => {
  it("given a script that exits with 3 when running it then 3 is resolved", async () => {
    const script = join(scratch, "exit-three.mjs");
    writeFileSync(script, "process.exitCode = 3;\n");

    await expect(runNode(script, [], scratch)).resolves.toBe(3);
  });

  it("given arguments and a folder when running a script then it receives both", async () => {
    const script = join(scratch, "echo-args.mjs");
    const out = join(scratch, "args.json");
    writeFileSync(
      script,
      [
        'import { writeFileSync } from "node:fs";',
        `writeFileSync(${JSON.stringify(out)}, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));`,
      ].join("\n"),
    );

    const code = await runNode(script, ["run", "--mutate", "src/a.ts"], scratch);

    expect({ code, written: JSON.parse(readFileSync(out, "utf8")) as unknown }).toEqual({
      code: 0,
      written: { args: ["run", "--mutate", "src/a.ts"], cwd: scratch },
    });
  });
});
