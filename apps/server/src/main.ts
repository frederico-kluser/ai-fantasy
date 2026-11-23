/**
 * Entry point of the local server: `node apps/server/src/main.ts` (Node.js 24
 * runs TypeScript by stripping types). Locates the repository, loads its `.env`,
 * reads the typed configuration and listens on 127.0.0.1, serving the built site.
 */
import { ENGINE_NAME } from "@ai-fantasy/engine";
import type { FastifyInstance } from "fastify";

import { loadConfig } from "./config.ts";
import { loadEnvFileIfPresent } from "./env.ts";
import { errorCodeOf } from "./fs-errors.ts";
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

/** Explains a listen failure for people, by error code. */
const LISTEN_FAILURES: ReadonlyMap<string, (port: number) => string> = new Map([
  [
    "EADDRINUSE",
    (port: number) =>
      `Erro: a porta ${port} de 127.0.0.1 já está em uso — Solução: feche o programa que a usa (outro npm start ou npm run dev, por exemplo) ou escolha outra porta em PORT, no ambiente ou no .env.`,
  ],
  [
    "EACCES",
    (port: number) =>
      `Erro: sem permissão para escutar na porta ${port} de 127.0.0.1 — Solução: escolha outra porta em PORT, no ambiente ou no .env (no Windows, o Hyper-V reserva faixas de portas: veja netsh interface ipv4 show excludedportrange protocol=tcp).`,
  ],
]);

/**
 * The `Erro: … — Solução: …` line for a server that could not listen on
 * `port`: a port in use (`EADDRINUSE`), a port the system refuses (`EACCES`,
 * such as the ranges Hyper-V reserves on Windows) or any other code.
 */
export function listenFailure(error: unknown, port: number): string {
  const code = errorCodeOf(error) ?? "desconhecido";
  const explain = LISTEN_FAILURES.get(code);
  return (
    explain?.(port) ??
    `Erro: o servidor não conseguiu escutar em 127.0.0.1:${port} (código ${code}) — Solução: confira PORT, no ambiente ou no .env, e se outro programa usa a porta.`
  );
}

/**
 * Starts the server from the environment and logs where it listens. A missing
 * repository, an invalid configuration (one line per invalid variable) or a port
 * the server cannot listen on logs `Erro: … — Solução: …` lines and starts
 * nothing.
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
  let app: FastifyInstance;
  try {
    app = await startServer({ config: config.value, webDistDir, logger: options.logStream });
  } catch (error) {
    options.log(listenFailure(error, config.value.port));
    return { ok: false, app: undefined };
  }
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
