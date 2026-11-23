import type { FastifyInstance, InjectOptions } from "fastify";
import { describe, expect, it, onTestFinished } from "vitest";

import {
  capturedLog,
  configFor,
  FAKE_KEY,
  jsonLines,
  LOCAL_HOST,
  temporaryFolder,
  testApp,
  testRoutes,
  writeTree,
} from "../test/support.ts";
import { HOST, listeningAddresses, LOG_REDACT_PATHS, startServer } from "./server.ts";

const ROUTE_NOT_FOUND = { error: { code: "NOT_FOUND", message: "Rota não encontrada." } };
const INTERNAL = {
  error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor; veja o log do servidor." },
};

async function started(): Promise<FastifyInstance> {
  const app = await startServer({
    config: configFor({ PORT: "0", DATA_DIR: temporaryFolder() }),
    webDistDir: temporaryFolder(),
  });
  onTestFinished(async () => {
    await app.close();
  });
  return app;
}

function origin(app: FastifyInstance, host: string): string {
  const ports = listeningAddresses(app).map((address) => address.port);
  return `http://${host}:${ports.join("")}`;
}

async function local(app: FastifyInstance, options: InjectOptions) {
  return app.inject({ ...options, headers: { host: LOCAL_HOST, ...options.headers } });
}

describe("local server address (overview §5, development-rules §11)", () => {
  it("given the host constant when reading it then it is 127.0.0.1", () => {
    expect(HOST).toBe("127.0.0.1");
  });

  it("given the server started when listing its address then it is 127.0.0.1", async () => {
    const app = await started();

    expect(listeningAddresses(app).map(({ address, family }) => ({ address, family }))).toEqual([
      { address: "127.0.0.1", family: "IPv4" },
    ]);
  });

  it("given the server started when calling /api/health then it answers from 127.0.0.1", async () => {
    const app = await started();

    const response = await fetch(`${origin(app, "127.0.0.1")}/api/health`);
    const body: unknown = await response.json();

    expect({ status: response.status, body }).toEqual({
      status: 200,
      body: { status: "ok", aiKeyConfigured: false },
    });
  });

  it("given the server started when connecting through the IPv6 loopback then the connection is refused", async () => {
    const app = await started();

    await expect(fetch(`${origin(app, "[::1]")}/api/health`)).rejects.toThrow();
  });
});

describe("health (GET /api/health)", () => {
  it("given a configured key when calling health then the response says configured and never contains the key", async () => {
    const { app } = testApp({ OPENROUTER_API_KEY: FAKE_KEY });

    const response = await local(app, { url: "/api/health" });

    expect({
      status: response.statusCode,
      body: response.json<unknown>(),
      hasKey: response.body.includes(FAKE_KEY),
    }).toEqual({ status: 200, body: { status: "ok", aiKeyConfigured: true }, hasKey: false });
  });

  it("given no key when calling health then the response says it is not configured", async () => {
    const { app } = testApp();

    const response = await local(app, { url: "/api/health" });

    expect(response.json<unknown>()).toEqual({ status: "ok", aiKeyConfigured: false });
  });
});

describe("site and unknown routes", () => {
  it("given a built site when requesting / then its index.html is served", async () => {
    const page = "<!doctype html><title>built-site-marker</title>";
    const site = temporaryFolder();
    writeTree(site, "index.html", page);
    const { app } = testApp({}, { webDistDir: site });

    const response = await local(app, { url: "/" });

    expect({ status: response.statusCode, body: response.body }).toEqual({
      status: 200,
      body: page,
    });
  });

  it("given a folder without index.html when requesting a file in it then nothing is served", async () => {
    const folder = temporaryFolder();
    writeTree(folder, "asset.txt", "not a site");
    const { app } = testApp({}, { webDistDir: folder });

    const response = await local(app, { url: "/asset.txt" });

    expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
      status: 404,
      body: ROUTE_NOT_FOUND,
    });
  });

  it("given an unknown API route when requesting it then the answer is the JSON error", async () => {
    const { app } = testApp();

    const response = await local(app, { method: "POST", url: "/api/unknown", payload: {} });

    expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
      status: 404,
      body: ROUTE_NOT_FOUND,
    });
  });
});

describe("extension point (plugins: AI routes, test mode and evaluation come this way)", () => {
  it("given a plugin when building the app then its routes answer with the configuration it was given", async () => {
    const { app } = testApp(
      { OPENROUTER_API_KEY: FAKE_KEY, PORT: "4320" },
      { plugins: [testRoutes] },
    );

    const response = await app.inject({
      url: "/api/test/config",
      headers: { host: "127.0.0.1:4320" },
    });

    expect(response.json<unknown>()).toEqual({ port: 4320, hasKey: true });
  });

  it("given a plugin route when a foreign Host calls it then the core protection answers 403", async () => {
    const { app } = testApp({}, { plugins: [testRoutes] });

    const response = await app.inject({
      url: "/api/test/config",
      headers: { host: "evil.example" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("given no plugins when calling a plugin route then it does not exist", async () => {
    const { app } = testApp();

    expect((await local(app, { url: "/api/test/config" })).statusCode).toBe(404);
  });
});

describe("request body limit (BODY_LIMIT_BYTES)", () => {
  const limited = { BODY_LIMIT_BYTES: "64" };

  it("given a body above the limit when posting then the server answers 413", async () => {
    const { app } = testApp(limited, { plugins: [testRoutes] });
    const payload = JSON.stringify({ pad: "x".repeat(55) });

    const response = await local(app, {
      method: "POST",
      url: "/api/test/state",
      headers: { "content-type": "application/json" },
      payload,
    });

    expect({
      size: payload.length,
      status: response.statusCode,
      body: response.json<unknown>(),
    }).toEqual({
      size: 65,
      status: 413,
      body: {
        error: {
          code: "BODY_TOO_LARGE",
          message:
            "O corpo do pedido passa do limite de tamanho desta rota (BODY_LIMIT_BYTES ou SESSION_BODY_LIMIT_BYTES).",
        },
      },
    });
  });

  it("given a body exactly at the limit when posting then it is accepted", async () => {
    const { app } = testApp(limited, { plugins: [testRoutes] });
    const payload = JSON.stringify({ pad: "x".repeat(54) });

    const response = await local(app, {
      method: "POST",
      url: "/api/test/state",
      headers: { "content-type": "application/json" },
      payload,
    });

    expect({ size: payload.length, status: response.statusCode }).toEqual({
      size: 64,
      status: 200,
    });
  });
});

describe("errors as JSON ({ error: { code, message } })", () => {
  it.each([
    ["/api/test/fail", 500, INTERNAL],
    ["/api/test/fail-with-status", 500, INTERNAL],
    [
      "/api/test/conflict",
      409,
      { error: { code: "REQUEST_REJECTED", message: "Pedido recusado." } },
    ],
  ])(
    "given the route %s that fails when calling it then the answer is %i with the JSON error",
    async (url, status, body) => {
      const { app } = testApp({}, { plugins: [testRoutes] });

      const response = await local(app, { url });

      expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
        status,
        body,
      });
    },
  );

  it("given a malformed percent-encoding in the path when requesting then the answer is 400 with the JSON error", async () => {
    const { app } = testApp();

    const response = await local(app, { url: "/api/sessions/campaigns/%E0%A4%A" });

    expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
      status: 400,
      body: { error: { code: "REQUEST_REJECTED", message: "Pedido recusado." } },
    });
  });
});

describe("log (LOG_LEVEL, pino with redaction)", () => {
  it("given a log destination when handling a request then the request is logged at info", async () => {
    const log = capturedLog();
    const { app } = testApp({}, { logger: log });

    await local(app, { url: "/api/health" });

    expect(jsonLines(log.lines)).toMatchObject([
      { level: 30, msg: "incoming request", req: { method: "GET", url: "/api/health" } },
      { level: 30, msg: "request completed", res: { statusCode: 200 } },
    ]);
  });

  it("given LOG_LEVEL warn when handling a request then nothing is written", async () => {
    const log = capturedLog();
    const { app } = testApp({ LOG_LEVEL: "warn" }, { logger: log });

    await local(app, { url: "/api/health" });

    expect(log.lines).toEqual([]);
  });

  it("given a route that fails when logging then the error is written at error level with its stack", async () => {
    const log = capturedLog();
    const { app } = testApp({}, { plugins: [testRoutes], logger: log });

    await local(app, { url: "/api/test/fail" });

    const failure = jsonLines(log.lines).find((line) =>
      JSON.stringify(line).includes('"msg":"request failed"'),
    );

    expect({
      failure,
      hasStack: JSON.stringify(failure).includes('"stack":"Error: test route failure'),
    }).toMatchObject({
      failure: { level: 50, msg: "request failed", err: { message: "test route failure" } },
      hasStack: true,
    });
  });

  it("given a request the server refuses when logging then only the framework code is written at info", async () => {
    const log = capturedLog();
    const { app } = testApp({}, { logger: log });

    await local(app, {
      method: "PUT",
      url: "/api/sessions/campaigns/tavern",
      headers: { "content-type": "text/plain" },
      payload: "the request body",
    });

    expect({
      line: jsonLines(log.lines).find((line) => JSON.stringify(line).includes("request rejected")),
      hasBody: log.lines.join("\n").includes("the request body"),
    }).toMatchObject({
      line: { level: 30, msg: "request rejected", code: "FST_ERR_CTP_INVALID_MEDIA_TYPE" },
      hasBody: false,
    });
  });

  it("given the redaction paths when reading them then they are the authorization and cookie headers", () => {
    expect(LOG_REDACT_PATHS).toEqual(["req.headers.authorization", "req.headers.cookie"]);
  });

  it("given a plugin that logs the request headers when credentials are sent then they are redacted", async () => {
    const log = capturedLog();
    const { app } = testApp({}, { plugins: [testRoutes], logger: log });

    await local(app, {
      url: "/api/test/log-headers",
      headers: { authorization: "Bearer header-token-123", cookie: "session=cookie-value-456" },
    });

    expect({
      line: jsonLines(log.lines).find((line) => JSON.stringify(line).includes('"msg":"headers"')),
      leaked: /header-token-123|cookie-value-456/.test(log.lines.join("\n")),
    }).toMatchObject({
      line: {
        req: {
          headers: { host: LOCAL_HOST, authorization: "[Redacted]", cookie: "[Redacted]" },
        },
      },
      leaked: false,
    });
  });
});

describe("the key never leaks (development-rules §11)", () => {
  const SLICE = '{"formatVersion":1}\n{"n":1}\n';
  const requests: readonly (readonly [string, InjectOptions])[] = [
    ["health", { url: "/api/health" }],
    ["the campaign list", { url: "/api/sessions/campaigns" }],
    ["reading a campaign", { url: "/api/sessions/campaigns/tavern" }],
    [
      "saving a campaign",
      { method: "PUT", url: "/api/sessions/campaigns/kitchen", payload: { formatVersion: 1 } },
    ],
    ["reading a slice", { url: "/api/sessions/campaigns/tavern/slices/1" }],
    [
      "saving a slice",
      {
        method: "PUT",
        url: "/api/sessions/campaigns/tavern/slices/2",
        headers: { "content-type": "application/x-ndjson" },
        payload: SLICE,
      },
    ],
    ["a missing campaign", { url: "/api/sessions/campaigns/missing" }],
    ["an invalid id", { url: "/api/sessions/campaigns/..%2Fx" }],
    ["an unknown route", { url: "/api/unknown" }],
    ["a foreign Host", { url: "/api/health", headers: { host: "evil.example" } }],
    [
      "a foreign Origin",
      {
        method: "POST",
        url: "/api/test/state",
        headers: { origin: "http://evil.example" },
        payload: {},
      },
    ],
    [
      "a body too large",
      { method: "POST", url: "/api/test/state", payload: { pad: "x".repeat(2048) } },
    ],
    [
      "an unsupported media type",
      {
        method: "PUT",
        url: "/api/sessions/campaigns/tavern",
        headers: { "content-type": "text/plain" },
        payload: "x",
      },
    ],
    ["a plugin reading the configuration", { url: "/api/test/config" }],
    ["a route that fails", { url: "/api/test/fail" }],
    [
      "credentials sent by the client",
      {
        url: "/api/test/log-headers",
        headers: { authorization: `Bearer ${FAKE_KEY}`, cookie: `key=${FAKE_KEY}` },
      },
    ],
  ];

  it.each(requests)(
    "given the key configured when requesting %s then neither the response nor the log contains it",
    async (_name, request) => {
      const log = capturedLog();
      const { app, dataDir } = testApp(
        { OPENROUTER_API_KEY: FAKE_KEY, LOG_LEVEL: "trace", BODY_LIMIT_BYTES: "1024" },
        { plugins: [testRoutes], logger: log },
      );
      writeTree(dataDir, "campaigns/tavern/campaign.json", '{"formatVersion":1}\n');
      writeTree(dataDir, "campaigns/tavern/slices/1.jsonl", SLICE);

      const response = await local(app, request);

      expect({
        inResponse: `${JSON.stringify(response.headers)}${response.body}`.includes(FAKE_KEY),
        inLog: log.lines.join("\n").includes(FAKE_KEY),
        logged: log.lines.length > 0,
      }).toEqual({ inResponse: false, inLog: false, logged: true });
    },
  );
});
