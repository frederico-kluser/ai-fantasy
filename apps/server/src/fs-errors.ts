/**
 * Node.js file system errors as values: they carry a `code` (`ENOENT`, `EPERM`…),
 * read through a schema (ADR 0021) instead of casts.
 */
import { z } from "zod";

const codedError = z.object({ code: z.string() });

/** The `code` of `error` (`ENOENT`, `EADDRINUSE`…), or `undefined` when it has none. */
export function errorCodeOf(error: unknown): string | undefined {
  const parsed = codedError.safeParse(error);
  return parsed.success ? parsed.data.code : undefined;
}

/** Whether `error` carries one of `codes` (a Node.js file system error, for example). */
export function hasErrorCode(error: unknown, codes: readonly string[]): boolean {
  const code = errorCodeOf(error);
  return code !== undefined && codes.includes(code);
}

/** `fallback` when `promise` fails because a file or folder does not exist (`ENOENT`). */
export async function unlessMissing<T, F>(promise: Promise<T>, fallback: F): Promise<T | F> {
  try {
    return await promise;
  } catch (error) {
    if (hasErrorCode(error, ["ENOENT"])) {
      return fallback;
    }
    throw error;
  }
}
