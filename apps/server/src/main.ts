/**
 * Entry point of the local server: `node apps/server/src/main.ts` (Node.js 24
 * runs TypeScript by stripping types). Loads the `.env` of the repository root,
 * reads the typed configuration and listens on 127.0.0.1.
 */
import { ENGINE_NAME } from "@ai-fantasy/engine";
import type { FastifyInstance } from "fastify";

import { loadConfig } from "./config.ts";
import { loadEnvFileIfPresent } from "./env.ts";
import { ROOT_ENV_FILE } from "./paths.ts";
import { listeningAddresses, startServer, type LogDestination } from "./server.ts";

/** What {@link main} needs from the outside world. */
export interface MainOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly envFile: string;
  /** Lines for people: where the server listens, or why it did not start. */
  readonly log: (line: string) => void;
  /** The server log (pino JSON lines, at `LOG_LEVEL`); without it nothing is logged. */
  readonly logStream?: LogDestination | undefined;
}

/** The running server, or `ok: false` after the error was logged. */
export type MainResult =
  | { readonly ok: true; readonly app: FastifyInstance }
  | { readonly ok: false; readonly app: undefined };

/**
 * Starts the server from the environment and logs where it listens. An invalid
 * configuration logs one `Erro: … — Solução: …` line per variable and does not
 * start the server.
 */
export async function main(options: MainOptions): Promise<MainResult> {
  loadEnvFileIfPresent(options.envFile);
  const config = loadConfig(options.env);
  if (!config.ok) {
    options.log(config.error);
    return { ok: false, app: undefined };
  }
  const app = await startServer({ config: config.value, logger: options.logStream });
  for (const { address, port } of listeningAddresses(app)) {
    options.log(`AI Fantasy (${ENGINE_NAME}): servidor local em http://${address}:${String(port)}`);
  }
  return { ok: true, app };
}

/** The real outside world: the process environment, the root `.env`, the console and stdout. */
export function defaultMainOptions(): MainOptions {
  return {
    env: process.env,
    envFile: ROOT_ENV_FILE,
    log: (line) => {
      console.log(line);
    },
    logStream: process.stdout,
  };
}

/* v8 ignore start -- @preserve: process entry point, exercised by `npm start` and the E2E run */
// Stryker disable all: process entry point, exercised by `npm start` and the E2E run
if (import.meta.main) {
  const result = await main(defaultMainOptions());
  process.exitCode = result.ok ? 0 : 1;
}
// Stryker restore all
/* v8 ignore stop -- @preserve */
