/**
 * The local server (overview §5): Fastify on 127.0.0.1 with the typed
 * configuration, the protection against other sites (overview §10), JSON errors,
 * `GET /api/health`, the session routes, the built site from `apps/web/dist` and
 * an extension point for the routes of later tasks.
 */
import { existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import type { FastifyInstance, FastifyPluginAsync, FastifyPluginCallback } from "fastify";

import type { ServerConfig } from "./config.ts";
import { handleError, handleNotFound } from "./errors.ts";
import { localOnly } from "./local-guard.ts";
import { sessionRoutes } from "./session-routes.ts";
import { createSessionStore } from "./session-store.ts";

/**
 * The only address the server listens on. It is a constant on purpose: nothing
 * can make the server listen elsewhere (ADR 0014, development-rules §11).
 */
export const HOST = "127.0.0.1";

/**
 * Log paths pino replaces with `[Redacted]`: credentials never reach the log,
 * even if a serializer starts writing the request headers.
 */
export const LOG_REDACT_PATHS = ["req.headers.authorization", "req.headers.cookie"] as const;

/** Where the log lines go (pino writes one JSON object per line). */
export interface LogDestination {
  readonly write: (line: string) => void;
}

/** Options every {@link ServerPlugin} receives. */
export interface ServerPluginOptions {
  readonly config: ServerConfig;
}

/**
 * A Fastify plugin that adds routes to the server, registered after the core
 * routes with the configuration in its options. The AI routes (AI-02, AI-03),
 * the test mode with fake ports and the evaluation routes (EVAL-01) come in this
 * way; the protection, the body limit and the JSON errors apply to them too.
 */
export type ServerPlugin =
  FastifyPluginCallback<ServerPluginOptions> | FastifyPluginAsync<ServerPluginOptions>;

/** Options of {@link buildApp}. */
export interface AppOptions {
  readonly config: ServerConfig;
  /** Folder of the built site (`apps/web/dist`, see `repositoryPaths`). */
  readonly webDistDir: string;
  /** Extra routes; see {@link ServerPlugin}. */
  readonly plugins?: readonly ServerPlugin[] | undefined;
  /** Where the log goes, at `config.logLevel`; without it the server logs nothing (tests). */
  readonly logger?: LogDestination | undefined;
}

function loggerOptions(config: ServerConfig, destination: LogDestination | undefined) {
  if (destination === undefined) {
    return false;
  }
  return { level: config.logLevel, redact: [...LOG_REDACT_PATHS], stream: destination };
}

function serveSite(app: FastifyInstance, webDistDir: string): void {
  if (existsSync(join(webDistDir, "index.html"))) {
    void app.register(fastifyStatic, { root: webDistDir });
  }
}

/**
 * Builds the Fastify app without listening, so tests can use `app.inject`.
 *
 * Every request first goes through the local protection (403); bodies are
 * limited to `config.bodyLimitBytes` (`config.sessionBodyLimitBytes` for the
 * session saves) and errors are JSON. Routes: `GET /api/health` answers
 * `{ status: "ok", aiKeyConfigured }`, the session routes live under
 * `/api/sessions`, the built site is served from `webDistDir` when it has an
 * `index.html`, then come the `plugins`.
 */
export function buildApp(options: AppOptions): FastifyInstance {
  const { config } = options;
  const app = Fastify({
    bodyLimit: config.bodyLimitBytes,
    logger: loggerOptions(config, options.logger),
    // Malformed URLs and over-long parameters are answered before routing: JSON errors too.
    frameworkErrors: handleError,
  });
  app.addHook("onRequest", localOnly(config.port));
  app.setErrorHandler(handleError);
  app.setNotFoundHandler(handleNotFound);
  app.get("/api/health", () => ({ status: "ok", aiKeyConfigured: config.aiApiKey !== undefined }));
  void app.register(sessionRoutes, {
    prefix: "/api/sessions",
    store: createSessionStore(config.dataDir),
    bodyLimit: config.sessionBodyLimitBytes,
  });
  serveSite(app, options.webDistDir);
  (options.plugins ?? []).forEach((plugin) => {
    void app.register(plugin, { config });
  });
  return app;
}

/** Builds the app and listens on {@link HOST} at `options.config.port`. */
export async function startServer(options: AppOptions): Promise<FastifyInstance> {
  const app = buildApp(options);
  await app.listen({ host: HOST, port: options.config.port });
  return app;
}

/** The TCP addresses the app listens on. */
export function listeningAddresses(app: FastifyInstance): AddressInfo[] {
  // Fastify only returns strings for pipe or socket listeners, and this server
  // always listens on HOST over TCP.
  return app.addresses() as AddressInfo[];
}
