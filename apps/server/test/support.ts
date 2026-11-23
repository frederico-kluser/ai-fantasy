/**
 * Helpers shared by the server tests. They hold no assertions of their own and
 * no branches: tests stay one behavior each (testing-strategy §2).
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { text } from "node:stream/consumers";

import type { FastifyInstance } from "fastify";
import { onTestFinished } from "vitest";

import { loadConfig, type ServerConfig } from "../src/config.ts";
import { buildApp, HOST, type AppOptions, type ServerPlugin } from "../src/server.ts";

/**
 * A recognizable fake OpenRouter key. Tests never read the real one from
 * `process.env`; they inject this value and check it never leaks.
 */
export const FAKE_KEY = "sk-or-v1-TEST-ONLY-0000-never-a-real-key-0000";

/** The `Host` an `inject` request carries by default: the server itself at the default port. */
export const LOCAL_HOST = "127.0.0.1:4318";

/** A new empty folder for the current test, removed when the test finishes. */
export function temporaryFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "ai-fantasy-server-"));
  onTestFinished(() => {
    rmSync(folder, { recursive: true, force: true });
  });
  return folder;
}

/** Writes `content` to `root/relativePath`, creating the folders on the way. */
export function writeTree(root: string, relativePath: string, content: string | Buffer): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

/** Every file and folder under `root`, as sorted relative paths with `/`. */
export function treeOf(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .map((path) => path.replaceAll("\\", "/"))
    .sort();
}

/** The configuration read from `env` (no `process.env`); the test fails if it is invalid. */
export function configFor(env: Readonly<Record<string, string>>): ServerConfig {
  const result = loadConfig(env);
  assert.ok(result.ok, "the test configuration is invalid");
  return result.value;
}

/** A log destination that keeps every line written to it. */
export interface CapturedLog {
  readonly write: (line: string) => void;
  readonly lines: string[];
}

/** A log destination for `buildApp({ logger })` that keeps the lines in memory. */
export function capturedLog(): CapturedLog {
  const lines: string[] = [];
  return {
    write: (line) => {
      lines.push(line);
    },
    lines,
  };
}

/** Each log line parsed as JSON (pino writes one JSON object per line). */
export function jsonLines(lines: readonly string[]): unknown[] {
  return lines.map((line): unknown => JSON.parse(line));
}

/** An app built for one test, with its own data folder. */
export interface TestApp {
  readonly app: FastifyInstance;
  readonly dataDir: string;
}

/**
 * An app for `inject` with its own empty data folder and no built site, closed
 * when the test finishes. `env` is the test environment (never `process.env`).
 */
export function testApp(
  env: Readonly<Record<string, string>> = {},
  options: Partial<Omit<AppOptions, "config">> = {},
): TestApp {
  const dataDir = temporaryFolder();
  const app = buildApp({
    config: configFor({ DATA_DIR: dataDir, ...env }),
    webDistDir: temporaryFolder(),
    ...options,
  });
  onTestFinished(async () => {
    await app.close();
  });
  return { app, dataDir };
}

/**
 * Routes added through the extension point, the way AI-02, AI-03 and EVAL-01 add
 * theirs: one route per method that changes state, the configuration it was
 * given, a failure and a route that logs the request headers.
 */
export const testRoutes: ServerPlugin = (app, { config }, done) => {
  app.route({
    method: ["POST", "PUT", "DELETE", "PATCH"],
    url: "/api/test/state",
    handler: (request) => ({ method: request.method, body: request.body }),
  });
  app.get("/api/test/config", () => ({ port: config.port, hasKey: config.aiApiKey !== undefined }));
  app.get("/api/test/fail", () => {
    throw new Error("test route failure");
  });
  app.get("/api/test/fail-with-status", () => {
    throw Object.assign(new Error("test route redirect"), { statusCode: 302 });
  });
  app.get("/api/test/conflict", () => {
    throw Object.assign(new Error("test route conflict"), { statusCode: 409 });
  });
  app.get("/api/test/log-headers", (request) => {
    // A serializer that keeps the headers: only the redaction can hide them.
    request.log
      .child({}, { serializers: { req: (value: unknown) => value } })
      .info({ req: { headers: request.headers } }, "headers");
    return { logged: true };
  });
  done();
};

/** Status code of a GET over a real socket with a chosen `Host` header. */
export async function statusWithHost(port: number, path: string, host: string): Promise<number> {
  const request = httpRequest({ host: HOST, port, path, headers: { host } });
  request.end();
  const response = await new Promise<{ statusCode?: number | undefined; resume: () => void }>(
    (resolve, reject) => {
      request.once("response", resolve);
      request.once("error", reject);
    },
  );
  response.resume();
  return response.statusCode ?? 0;
}

/** The raw response to a raw HTTP request text sent over a real socket. */
export async function rawExchange(port: number, requestText: string): Promise<string> {
  const socket = connect(port, HOST);
  socket.end(requestText);
  return text(socket);
}
