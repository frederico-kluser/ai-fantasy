/** What changed since the merge base with a ref: shared by the incremental gates. */
import type { GitResult } from "./io.ts";
import type { Result } from "./result.ts";

/** Output of the chosen `git diff` and the files git does not track yet. */
export interface Changes {
  readonly diff: string;
  readonly untracked: readonly string[];
}

/**
 * Runs `git <diffArgs> <merge-base>` (committed and uncommitted changes since the
 * merge base of `base` and HEAD) and lists the untracked files.
 */
export function changesSince(
  git: (args: readonly string[]) => GitResult,
  base: string,
  diffArgs: readonly string[],
): Result<Changes> {
  const mergeBase = git(["merge-base", base, "HEAD"]);
  if (!mergeBase.ok) {
    return {
      ok: false,
      error: `não foi possível achar a base ${base} (${mergeBase.output.trim()}) — Solução: git fetch origin main, ou passe --base <ref>.`,
    };
  }
  const diff = git([...diffArgs, mergeBase.output.trim()]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const failed = [diff, untracked].find((result) => !result.ok);
  if (failed !== undefined) {
    return {
      ok: false,
      error: `git falhou (${failed.output.trim()}) — Solução: rode na raiz de um clone com o histórico completo.`,
    };
  }
  const files = untracked.output.split("\n").filter((file) => file !== "");
  return { ok: true, value: { diff: diff.output, untracked: files } };
}
