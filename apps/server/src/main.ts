/**
 * Entry point of the local server: `node apps/server/src/main.ts` (Node.js 24
 * runs TypeScript by stripping types). Locates the repository, loads its `.env`,
 * reads `PORT` and listens on 127.0.0.1, serving the built site.
 */
import { ENGINE_NAME } from "@ai-fantasy/engine";
import type { FastifyInstance } from "fastify";

import { loadEnvFileIfPresent, resolvePort } from "./env.ts";
import { repositoryPaths, type PathsResult } from "./paths.ts";
import { DEFAULT_PORT, listeningAddresses, startServer } from "./server.ts";

/** What {@link main} needs from the outside world. */
export interface MainOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Where the repository is (its `.env` and built site), or why it was not found. */
  readonly paths: PathsResult;
  readonly log: (line: string) => void;
}

/** The running server, or `ok: false` after the error was logged. */
export type MainResult =
  | { readonly ok: true; readonly app: FastifyInstance }
  | { readonly ok: false; readonly app: undefined };

/** Starts the server from the environment and logs where it listens. */
export async function main(options: MainOptions): Promise<MainResult> {
  if (!options.paths.ok) {
    options.log(options.paths.error);
    return { ok: false, app: undefined };
  }
  const { envFile, webDistDir } = options.paths.value;
  loadEnvFileIfPresent(envFile);
  const port = resolvePort(options.env["PORT"]);
  if (!port.ok) {
    options.log(
      `Erro: ${port.error} — Solução: corrija PORT no ambiente ou no .env (padrão ${String(DEFAULT_PORT)}).`,
    );
    return { ok: false, app: undefined };
  }
  const app = await startServer({ port: port.value, webDistDir });
  for (const { address, port: bound } of listeningAddresses(app)) {
    options.log(
      `AI Fantasy (${ENGINE_NAME}): servidor local em http://${address}:${String(bound)}`,
    );
  }
  return { ok: true, app };
}

/** The real outside world: the process environment, this repository and the console. */
export function defaultMainOptions(): MainOptions {
  return {
    env: process.env,
    paths: repositoryPaths(),
    log: (line) => {
      console.log(line);
    },
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
