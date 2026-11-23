import { describe, expect, it, onTestFinished } from "vitest";

import {
  configFor,
  LOCAL_HOST,
  rawExchange,
  statusWithHost,
  temporaryFolder,
  testApp,
  testRoutes,
  treeOf,
} from "../test/support.ts";
import { DEV_SERVER_PORT, trustedHosts } from "./local-guard.ts";
import { listeningAddresses, startServer } from "./server.ts";

const FORBIDDEN_HOST = {
  error: {
    code: "FORBIDDEN_HOST",
    message: "Host não permitido: o servidor local só atende 127.0.0.1 e localhost.",
  },
};
const FORBIDDEN_ORIGIN = {
  error: {
    code: "FORBIDDEN_ORIGIN",
    message: "Origem não permitida: só o próprio site local pode mudar dados.",
  },
};

async function startedOnFreePort() {
  const app = await startServer({
    config: configFor({ PORT: "0", DATA_DIR: temporaryFolder() }),
    webDistDir: temporaryFolder(),
  });
  onTestFinished(async () => {
    await app.close();
  });
  return Math.max(...listeningAddresses(app).map((address) => address.port));
}

describe("trusted hosts (overview §10)", () => {
  it("given the Vite dev server port when reading it then it is 5173", () => {
    expect(DEV_SERVER_PORT).toBe(5173);
  });

  it("given the server port when listing the trusted hosts then they are 127.0.0.1 and localhost at it and at the Vite port", () => {
    expect([...trustedHosts(4318)]).toEqual([
      "127.0.0.1:4318",
      "localhost:4318",
      "127.0.0.1:5173",
      "localhost:5173",
    ]);
  });
});

describe("Host header (protection against DNS rebinding)", () => {
  it.each([
    "127.0.0.1:4318",
    "localhost:4318",
    "127.0.0.1:5173",
    "localhost:5173",
    "LocalHost:4318",
  ])("given the Host %s when requesting then the request goes on", async (host) => {
    const { app } = testApp();

    const response = await app.inject({ url: "/api/health", headers: { host } });

    expect(response.statusCode).toBe(200);
  });

  it.each([
    "evil.example:4318",
    "evil.example",
    "127.0.0.1",
    "localhost",
    "127.0.0.1:4319",
    "localhost:3000",
    "127.0.0.2:4318",
    "[::1]:4318",
    "127.0.0.1:4318.evil.example",
  ])("given the Host %s when requesting then the server answers 403", async (host) => {
    const { app } = testApp();

    const response = await app.inject({ url: "/api/health", headers: { host } });

    expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
      status: 403,
      body: FORBIDDEN_HOST,
    });
  });

  it("given a foreign Host when requesting an unknown route then the server answers 403, not 404", async () => {
    const { app } = testApp();

    const response = await app.inject({ url: "/nothing-here", headers: { host: "evil.example" } });

    expect(response.statusCode).toBe(403);
  });

  it("given a foreign Host when saving a campaign then the server answers 403 and writes nothing", async () => {
    const { app, dataDir } = testApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/sessions/campaigns/tavern",
      headers: { host: "evil.example:4318" },
      payload: { formatVersion: 1 },
    });

    expect({ status: response.statusCode, files: treeOf(dataDir) }).toEqual({
      status: 403,
      files: [],
    });
  });

  it("given a real socket when the Host names the port the server listens on then the request goes on", async () => {
    const port = await startedOnFreePort();

    const response = await fetch(`http://127.0.0.1:${String(port)}/api/health`);

    expect(response.status).toBe(200);
  });

  it("given a real socket when the Host is foreign then the server answers 403", async () => {
    const port = await startedOnFreePort();

    await expect(statusWithHost(port, "/api/health", `evil.example:${String(port)}`)).resolves.toBe(
      403,
    );
  });

  it("given a real socket when the request has no Host (HTTP/1.0) then the server answers 403", async () => {
    const port = await startedOnFreePort();

    const response = await rawExchange(port, "GET /api/health HTTP/1.0\r\n\r\n");

    expect(response).toMatch(/^HTTP\/1\.1 403 /);
  });
});

describe("Origin of requests that change state (no other site spends the key)", () => {
  it.each(["POST", "PUT", "DELETE", "PATCH"] as const)(
    "given a %s from a foreign site when requesting then the server answers 403",
    async (method) => {
      const { app } = testApp({}, { plugins: [testRoutes] });

      const response = await app.inject({
        method,
        url: "/api/test/state",
        headers: { host: LOCAL_HOST, origin: "http://evil.example" },
        payload: { spend: "the key" },
      });

      expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
        status: 403,
        body: FORBIDDEN_ORIGIN,
      });
    },
  );

  it.each([
    "null",
    "https://127.0.0.1:4318",
    "http://127.0.0.1:4319",
    "http://localhost:3000",
    "http://127.0.0.1:4318.evil.example",
    "http://127.0.0.1",
  ])(
    "given a POST with the Origin %s when requesting then the server answers 403",
    async (origin) => {
      const { app } = testApp({}, { plugins: [testRoutes] });

      const response = await app.inject({
        method: "POST",
        url: "/api/test/state",
        headers: { host: LOCAL_HOST, origin },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
    },
  );

  it.each([
    "http://127.0.0.1:4318",
    "http://localhost:4318",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "HTTP://LOCALHOST:5173",
  ])(
    "given a POST with the Origin %s of the local site when requesting then it goes on",
    async (origin) => {
      const { app } = testApp({}, { plugins: [testRoutes] });

      const response = await app.inject({
        method: "POST",
        url: "/api/test/state",
        headers: { host: LOCAL_HOST, origin },
        payload: { n: 1 },
      });

      expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
        status: 200,
        body: { method: "POST", body: { n: 1 } },
      });
    },
  );

  it("given a POST without Origin (a local tool, not a browser) when requesting then it goes on", async () => {
    const { app } = testApp({}, { plugins: [testRoutes] });

    const response = await app.inject({
      method: "POST",
      url: "/api/test/state",
      headers: { host: LOCAL_HOST },
      payload: { n: 2 },
    });

    expect(response.statusCode).toBe(200);
  });

  it("given a GET from a foreign site when requesting then it is served without CORS headers", async () => {
    const { app } = testApp();

    const response = await app.inject({
      url: "/api/health",
      headers: { host: LOCAL_HOST, origin: "http://evil.example" },
    });

    expect({
      status: response.statusCode,
      cors: response.headers["access-control-allow-origin"],
    }).toEqual({ status: 200, cors: undefined });
  });

  it("given a CORS preflight from a foreign site when requesting then nothing allows it", async () => {
    const { app } = testApp({}, { plugins: [testRoutes] });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/test/state",
      headers: {
        host: LOCAL_HOST,
        origin: "http://evil.example",
        "access-control-request-method": "POST",
      },
    });

    expect({
      status: response.statusCode,
      allowOrigin: response.headers["access-control-allow-origin"],
      allowMethods: response.headers["access-control-allow-methods"],
    }).toEqual({ status: 404, allowOrigin: undefined, allowMethods: undefined });
  });
});
