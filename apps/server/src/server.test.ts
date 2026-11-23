import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";
import { afterAll, describe, expect, it, onTestFinished } from "vitest";

import { buildApp, DEFAULT_PORT, HOST, listeningAddresses, startServer } from "./server.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-server-"));
const emptyDir = join(scratch, "empty");
mkdirSync(emptyDir);

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** Creates `scratch/<name>/<file>` and returns the folder. */
function folderWith(name: string, file: string, content: string): string {
  const dir = join(scratch, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), content);
  return dir;
}

async function started(): Promise<FastifyInstance> {
  const app = await startServer({ port: 0, webDistDir: emptyDir });
  onTestFinished(async () => {
    await app.close();
  });
  return app;
}

function origin(app: FastifyInstance, host: string): string {
  const ports = listeningAddresses(app).map((address) => address.port);
  return `http://${host}:${ports.join("")}`;
}

describe("local server address (overview §5, development-rules §11)", () => {
  it("given the host constant when reading it then it is 127.0.0.1", () => {
    expect(HOST).toBe("127.0.0.1");
  });

  it("given the default port when reading it then it is 4318", () => {
    expect(DEFAULT_PORT).toBe(4318);
  });

  it("given the server started when listing its address then it is 127.0.0.1 only", async () => {
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
      body: { status: "ok" },
    });
  });

  it("given the server started when connecting through the IPv6 loopback then the connection is refused", async () => {
    const app = await started();

    await expect(fetch(`${origin(app, "[::1]")}/api/health`)).rejects.toThrow();
  });
});

describe("routes", () => {
  it("given the app when requesting /api/health then the body is status ok", async () => {
    const app = buildApp({ webDistDir: emptyDir });

    const response = await app.inject({ method: "GET", url: "/api/health" });
    const body: unknown = response.json();

    expect({ status: response.statusCode, body }).toEqual({
      status: 200,
      body: { status: "ok" },
    });
  });

  it("given a built site when requesting / then its index.html is served", async () => {
    const page = "<!doctype html><title>built-site-marker</title>";
    const app = buildApp({ webDistDir: folderWith("site", "index.html", page) });

    const response = await app.inject({ method: "GET", url: "/" });

    expect({ status: response.statusCode, body: response.body }).toEqual({
      status: 200,
      body: page,
    });
  });

  it("given a folder without index.html when requesting a file in it then nothing is served", async () => {
    const app = buildApp({ webDistDir: folderWith("not-a-site", "asset.txt", "not a site") });

    const response = await app.inject({ method: "GET", url: "/asset.txt" });

    expect(response.statusCode).toBe(404);
  });
});
