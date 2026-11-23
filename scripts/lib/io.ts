/** Small I/O helpers shared by the gate scripts; the logic lives in pure functions. */
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

/** Outcome of {@link runGit}: stdout when it worked, stderr when it did not. */
export interface GitResult {
  readonly ok: boolean;
  readonly output: string;
}

/** Reads a UTF-8 text file; `undefined` when it does not exist. Other errors are raised. */
export function readTextFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    // Node.js file errors carry a `code`; the cast only reads it.
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/**
 * Runs a Node.js script with the current Node.js binary, sharing the terminal, and
 * resolves its exit code (1 when it was killed by a signal). No shell is involved,
 * so it behaves the same on Windows and Linux.
 */
export function runNode(script: string, args: readonly string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, stdio: "inherit" });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

/** Runs `git <args>` in `cwd` without a shell. */
export function runGit(args: readonly string[], cwd: string): GitResult {
  const run = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return run.status === 0 ? { ok: true, output: run.stdout } : { ok: false, output: run.stderr };
}

/**
 * Appends Markdown to the GitHub Actions job summary (`$GITHUB_STEP_SUMMARY`).
 *
 * @returns whether there was a summary file to write to.
 */
export function appendStepSummary(markdown: string, summaryFile: string | undefined): boolean {
  if (summaryFile === undefined || summaryFile === "") {
    return false;
  }
  appendFileSync(summaryFile, `${markdown}\n`);
  return true;
}
