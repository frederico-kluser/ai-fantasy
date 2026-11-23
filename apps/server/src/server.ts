/**
 * The local server (overview §5): Fastify on 127.0.0.1, serving the API routes
 * and, when it was built, the site from `apps/web/dist`.
 */
import { existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

/**
 * The only address the server listens on. It is a constant on purpose: nothing
 * can make the server listen elsewhere (ADR 0014, development-rules §11).
 */
export const HOST = "127.0.0.1";

/** Default port of the local server; `PORT` overrides it (ai-integration §3). */
export const DEFAULT_PORT = 4318;

/** Where `npm run build` writes the site. */
export const WEB_DIST_DIR = fileURLToPath(new URL("../../web/dist/", import.meta.url));

/** Options of {@link buildApp}. */
export interface AppOptions {
  /** Folder of the built site; defaults to {@link WEB_DIST_DIR}. */
  readonly webDistDir?: string;
}

/** Options of {@link startServer}. */
export interface StartOptions extends AppOptions {
  /** TCP port; `0` lets the system pick a free one. */
  readonly port: number;
}

/**
 * Builds the Fastify app without listening, so tests can use `app.inject`.
 *
 * Routes: `GET /api/health` answers `{ status: "ok" }`; the built site is served
 * from `webDistDir` when it has an `index.html`.
 */
export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify();
  app.get("/api/health", () => ({ status: "ok" }));
  const webDistDir = options.webDistDir ?? WEB_DIST_DIR;
  if (existsSync(join(webDistDir, "index.html"))) {
    void app.register(fastifyStatic, { root: webDistDir });
  }
  return app;
}

/** Builds the app and listens on {@link HOST} at `options.port`. */
export async function startServer(options: StartOptions): Promise<FastifyInstance> {
  const app = buildApp(options);
  await app.listen({ host: HOST, port: options.port });
  return app;
}

/** The TCP addresses the app listens on. */
export function listeningAddresses(app: FastifyInstance): AddressInfo[] {
  // Fastify only returns strings for pipe or socket listeners, and this server
  // always listens on HOST over TCP.
  return app.addresses() as AddressInfo[];
}
