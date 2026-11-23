/**
 * Server configuration read from the environment (ai-integration §3). SRV-01
 * grows this into the typed configuration of every `AI_*` variable.
 */
import { DEFAULT_PORT } from "./server.ts";

/** Result of {@link resolvePort}: the port or why the value is invalid. */
export type PortResult =
  { readonly ok: true; readonly value: number } | { readonly ok: false; readonly error: string };

const PORT_PATTERN = /^\d{1,5}$/;
const HIGHEST_PORT = 65_535;

/**
 * Reads `PORT`: missing or empty means {@link DEFAULT_PORT}; otherwise it must be
 * an integer from 0 to 65535 written with digits only.
 */
export function resolvePort(raw: string | undefined): PortResult {
  if (raw === undefined || raw === "") {
    return { ok: true, value: DEFAULT_PORT };
  }
  const value = Number(raw);
  if (!PORT_PATTERN.test(raw) || value > HIGHEST_PORT) {
    return { ok: false, error: `PORT inválido: "${raw}" (use um inteiro de 0 a 65535)` };
  }
  return { ok: true, value };
}

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
