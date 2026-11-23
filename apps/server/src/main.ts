/**
 * Entry point of the local server: `node apps/server/src/main.ts` (Node.js 24
 * runs TypeScript by stripping types). Locates the repository, loads its `.env`,
 * reads the typed configuration and listens on 127.0.0.1, serving the built site.
 */
import { ENGINE_NAME } from "@ai-fantasy/engine";
import type { FastifyInstance } from "fastify";

import { loadConfig } from "./config.ts";
import { loadEnvFileIfPresent } from "./env.ts";
import { repositoryPaths, type PathsResult } from "./paths.ts";
import { listeningAddresses, startServer, type LogDestination } from "./server.ts";

/** What {@link main} needs from the outside world. */
export interface MainOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Where the repository is (its `.env`, built site and data folder), or why it was not found. */
  readonly paths: PathsResult;
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
 * Starts the server from the environment and logs where it listens. A missing
 * repository or an invalid configuration logs `Erro: … — Solução: …` lines (one
 * per invalid variable) and starts nothing.
 */
export async function main(options: MainOptions): Promise<MainResult> {
  if (!options.paths.ok) {
    options.log(options.paths.error);
    return { ok: false, app: undefined };
  }
  const { root, envFile, webDistDir } = options.paths.value;
  loadEnvFileIfPresent(envFile);
  const config = loadConfig(options.env, root);
  if (!config.ok) {
    options.log(config.error);
    return { ok: false, app: undefined };
  }
  const app = await startServer({ config: config.value, webDistDir, logger: options.logStream });
  for (const { address, port } of listeningAddresses(app)) {
    options.log(`AI Fantasy (${ENGINE_NAME}): servidor local em http://${address}:${String(port)}`);
  }
  return { ok: true, app };
}

/** The real outside world: the process environment, this repository, the console and stdout. */
export function defaultMainOptions(): MainOptions {
  return {
    env: process.env,
    paths: repositoryPaths(),
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
