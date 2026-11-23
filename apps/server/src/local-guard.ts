/**
 * Protection of the local server against sites open in the same browser
 * (overview §10). Listening on 127.0.0.1 is not enough: a page from another site
 * can still send requests to it, and the AI routes spend the OpenRouter key.
 *
 * - **Host**: only `127.0.0.1` and `localhost` at the server port or at the Vite
 *   dev server port; anything else is 403. This defeats DNS rebinding, where a
 *   foreign name resolves to 127.0.0.1.
 * - **Origin**: a request that may change state (any method but GET, HEAD and
 *   OPTIONS) carrying an `Origin` header passes only if that origin is the local
 *   site; anything else is 403. Requests without `Origin` (local tools) pass.
 * - **No CORS**: no `Access-Control-Allow-*` header is ever sent, so the browser
 *   keeps other sites from reading the answers.
 */
import type { FastifyRequest, onRequestHookHandler } from "fastify";

import { API_ERRORS, sendError, type ApiError } from "./errors.ts";

/**
 * Port of the Vite dev server (`apps/web/vite.config.ts`), which forwards `/api`
 * here and keeps the page's `Origin`.
 */
export const DEV_SERVER_PORT = 5173;

const LOOPBACK_NAMES = ["127.0.0.1", "localhost"] as const;

/** Methods that never change state. */
const SAFE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

/** The `Host` values the server answers, for a server listening on `port`. */
export function trustedHosts(port: number): ReadonlySet<string> {
  return new Set(
    [port, DEV_SERVER_PORT].flatMap((trusted) =>
      LOOPBACK_NAMES.map((name) => `${name}:${String(trusted)}`),
    ),
  );
}

/** Why `request` is refused, or `undefined` when it may go on; `port` is where it arrived. */
function refusal(request: FastifyRequest, port: number): ApiError | undefined {
  const hosts = trustedHosts(port);
  if (!hosts.has((request.headers.host ?? "").toLowerCase())) {
    return API_ERRORS.forbiddenHost;
  }
  const origin = request.headers.origin;
  const trustedOrigin = [...hosts].some((host) => origin?.toLowerCase() === `http://${host}`);
  if (origin !== undefined && !SAFE_METHODS.has(request.method) && !trustedOrigin) {
    return API_ERRORS.forbiddenOrigin;
  }
  return undefined;
}

/**
 * The `onRequest` hook that refuses foreign hosts and origins with 403. The port
 * is the one the connection arrived on; `fallbackPort` (the configured port)
 * serves requests that have no socket port, such as `inject` in tests.
 */
export function localOnly(fallbackPort: number): onRequestHookHandler {
  return (request, reply, done) => {
    const error = refusal(request, request.socket.localPort ?? fallbackPort);
    if (error === undefined) {
      done();
      return;
    }
    void sendError(reply, 403, error);
  };
}
