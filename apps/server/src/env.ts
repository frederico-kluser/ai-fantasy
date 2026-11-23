/**
 * Loading of the `.env` file of the repository root (ai-integration §2). The
 * typed configuration that reads the variables lives in `config.ts`.
 */

function isMissingFile(error: unknown): boolean {
  // Node.js file errors carry a `code`; the cast only reads it.
  return error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT";
}

/**
 * Loads `path` into `process.env` with `process.loadEnvFile`. Variables already in
 * the environment win. A missing file is not an error (the `.env` is optional);
 * any other failure is raised.
 *
 * @returns whether the file existed and was loaded.
 */
export function loadEnvFileIfPresent(path: string): boolean {
  try {
    process.loadEnvFile(path);
    return true;
  } catch (error) {
    if (isMissingFile(error)) {
      return false;
    }
    throw error;
  }
}
