/**
 * Error responses of the local server (overview §5): every error is JSON,
 * `{ "error": { "code": "…", "message": "…" } }`, with a stable code for the site
 * and a message in Portuguese for people. Messages never echo request content.
 */
import { STATUS_CODES } from "node:http";

import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

/** The body of an error response. */
export interface ApiError {
  /** Stable, for code: `INVALID_ID`, `NOT_FOUND`, `FORBIDDEN_HOST`… */
  readonly code: string;
  /** For people, in Portuguese. */
  readonly message: string;
}

/** The errors the server answers with, by name. */
export const API_ERRORS = {
  invalidId: {
    code: "INVALID_ID",
    message:
      "Id inválido: use de 1 a 64 caracteres entre a-z, 0-9 e '-', começando por letra ou número e sem nome reservado do Windows (con, nul…).",
  },
  invalidCampaign: {
    code: "INVALID_BODY",
    message:
      "Campanha inválida: o corpo tem de ser um objeto JSON com formatVersion inteiro maior ou igual a 1.",
  },
  invalidJson: { code: "INVALID_BODY", message: "O corpo não é JSON válido." },
  sessionBusy: {
    code: "SESSION_BUSY",
    message:
      "A sessão está em uso (outra gravação ou leitura em andamento) e não foi gravada; tente de novo.",
  },
  campaignNotFound: { code: "NOT_FOUND", message: "Campanha não encontrada." },
  sliceNotFound: { code: "NOT_FOUND", message: "Fatia não encontrada." },
  routeNotFound: { code: "NOT_FOUND", message: "Rota não encontrada." },
  forbiddenHost: {
    code: "FORBIDDEN_HOST",
    message: "Host não permitido: o servidor local só atende 127.0.0.1 e localhost.",
  },
  forbiddenOrigin: {
    code: "FORBIDDEN_ORIGIN",
    message: "Origem não permitida: só o próprio site local pode mudar dados.",
  },
  bodyTooLarge: {
    code: "BODY_TOO_LARGE",
    message:
      "O corpo do pedido passa do limite de tamanho desta rota (BODY_LIMIT_BYTES ou SESSION_BODY_LIMIT_BYTES).",
  },
  unsupportedMediaType: {
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Tipo de conteúdo não aceito nesta rota.",
  },
  requestRejected: { code: "REQUEST_REJECTED", message: "Pedido recusado." },
  malformedRequest: { code: "MALFORMED_REQUEST", message: "Pedido HTTP malformado." },
  headersTooLarge: {
    code: "HEADERS_TOO_LARGE",
    message: "Os cabeçalhos do pedido passam do tamanho máximo.",
  },
  requestTimeout: { code: "REQUEST_TIMEOUT", message: "O pedido demorou demais para chegar." },
  internal: {
    code: "INTERNAL_ERROR",
    message: "Erro interno do servidor; veja o log do servidor.",
  },
} as const satisfies Record<string, ApiError>;

/** Framework errors (by Fastify code) that have an error of their own. */
const FRAMEWORK_ERRORS: ReadonlyMap<string, ApiError> = new Map<string, ApiError>([
  ["FST_ERR_CTP_BODY_TOO_LARGE", API_ERRORS.bodyTooLarge],
  ["FST_ERR_CTP_INVALID_MEDIA_TYPE", API_ERRORS.unsupportedMediaType],
  ["FST_ERR_CTP_INVALID_JSON_BODY", API_ERRORS.invalidJson],
  ["FST_ERR_CTP_EMPTY_JSON_BODY", API_ERRORS.invalidJson],
]);

/** Errors of the HTTP parser (by Node.js code) that have a status and an error of their own. */
const CLIENT_ERRORS: ReadonlyMap<string, { readonly status: number; readonly error: ApiError }> =
  new Map([
    ["HPE_HEADER_OVERFLOW", { status: 431, error: API_ERRORS.headersTooLarge }],
    ["ERR_HTTP_REQUEST_TIMEOUT", { status: 408, error: API_ERRORS.requestTimeout }],
  ]);

const MALFORMED = { status: 400, error: API_ERRORS.malformedRequest };

/** The part of a client socket that {@link handleClientError} uses. */
export interface ClientSocket {
  readonly destroyed: boolean;
  readonly writable: boolean;
  write(data: string): unknown;
  destroy(): unknown;
}

/**
 * Handler of the errors the HTTP parser finds before Fastify sees a request
 * (Fastify's `clientErrorHandler`): a malformed request (400), headers above the
 * maximum size (431) or a request that took too long (408) get the JSON error
 * and the connection is closed. A connection the client reset is left alone.
 */
export function handleClientError(error: { readonly code?: string }, socket: ClientSocket): void {
  if (error.code === "ECONNRESET" || socket.destroyed) {
    return;
  }
  if (socket.writable) {
    const { status, error: body } = CLIENT_ERRORS.get(error.code ?? "") ?? MALFORMED;
    const json = JSON.stringify({ error: body });
    socket.write(
      `HTTP/1.1 ${String(status)} ${STATUS_CODES[status] ?? ""}\r\nConnection: close\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${String(Buffer.byteLength(json))}\r\n\r\n${json}`,
    );
  }
  socket.destroy();
}

/** Answers with `status` and the JSON body `{ error }`. */
export function sendError(reply: FastifyReply, status: number, error: ApiError): FastifyReply {
  return reply.code(status).send({ error });
}

/**
 * Error handler of the app. A client error (4xx) keeps its status, is logged at
 * `info` with the framework code only and gets its own error or
 * `REQUEST_REJECTED`; anything else is a 500, logged at `error` with the stack,
 * with a generic message.
 */
export function handleError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const status = error.statusCode ?? 500;
  if (status < 400 || status >= 500) {
    request.log.error({ err: error }, "request failed");
    void sendError(reply, 500, API_ERRORS.internal);
    return;
  }
  request.log.info({ code: error.code }, "request rejected");
  void sendError(reply, status, FRAMEWORK_ERRORS.get(error.code) ?? API_ERRORS.requestRejected);
}

/** Not-found handler of the app: unknown routes and files get the JSON error. */
export function handleNotFound(_request: FastifyRequest, reply: FastifyReply): void {
  void sendError(reply, 404, API_ERRORS.routeNotFound);
}
