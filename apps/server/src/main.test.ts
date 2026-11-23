import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it, onTestFinished, vi } from "vitest";

import { capturedLog, configFor, FAKE_KEY, jsonLines } from "../test/support.ts";
import { defaultMainOptions, main, type MainResult } from "./main.ts";
import type { PathsResult } from "./paths.ts";
import { listeningAddresses, startServer } from "./server.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-main-"));
const emptySite = join(scratch, "empty-site");
mkdirSync(emptySite);
const VARIABLE = "AI_FANTASY_MAIN_TEST_VARIABLE";

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** Repository paths for a test: a scratch root (its `data/` included), an `.env` and a site folder. */
function paths(envFile: string, webDistDir: string = emptySite): PathsResult {
  return { ok: true, value: { root: scratch, envFile, webDistDir } };
}

const NO_ENV = paths(join(scratch, "missing.env"));

/** A port that was free a moment ago: listen on 0, read the port, close. */
async function freePort(): Promise<number> {
  const probe = await startServer({
    config: configFor({ PORT: "0", DATA_DIR: scratch }),
    webDistDir: emptySite,
  });
  const ports = listeningAddresses(probe).map((address) => address.port);
  await probe.close();
  return Math.max(...ports);
}

function closeAfterTest(result: MainResult): MainResult {
  onTestFinished(async () => {
    await result.app?.close();
  });
  return result;
}

/** The repository root as git sees it: independent from how paths.ts finds it. */
function gitTopLevel(): string {
  const run = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return resolve(run.stdout.trim());
}

describe("server entry point", () => {
  it("given a PORT when running main then the server listens on 127.0.0.1 at that port and says where", async () => {
    const port = await freePort();
    const lines: string[] = [];

    const result = closeAfterTest(
      await main({ env: { PORT: String(port) }, paths: NO_ENV, log: (line) => lines.push(line) }),
    );

    expect({ ok: result.ok, lines }).toEqual({
      ok: true,
      lines: [`AI Fantasy (Hermeneutic Core): servidor local em http://127.0.0.1:${String(port)}`],
    });
  });

  it("given an .env file when running main then its variables are loaded", async () => {
    const envFile = join(scratch, "values.env");
    writeFileSync(envFile, `${VARIABLE}=loaded\n`);
    onTestFinished(() => {
      Reflect.deleteProperty(process.env, VARIABLE);
    });

    closeAfterTest(await main({ env: { PORT: "0" }, paths: paths(envFile), log: () => undefined }));

    expect(process.env[VARIABLE]).toBe("loaded");
  });

  it("given a built site in the repository when running main then the server delivers it", async () => {
    const site = join(scratch, "built-site");
    mkdirSync(site);
    writeFileSync(join(site, "index.html"), "<title>main-site-marker</title>");
    const port = await freePort();

    closeAfterTest(
      await main({
        env: { PORT: String(port) },
        paths: paths(join(scratch, "missing.env"), site),
        log: () => undefined,
      }),
    );
    const response = await fetch(`http://127.0.0.1:${String(port)}/`);

    expect(await response.text()).toBe("<title>main-site-marker</title>");
  });

  it("given the repository root when running main then sessions are saved in its data folder", async () => {
    const result = closeAfterTest(
      await main({ env: { PORT: "0" }, paths: NO_ENV, log: () => undefined }),
    );
    assert.ok(result.ok);
    const port = Math.max(...listeningAddresses(result.app).map((address) => address.port));

    await fetch(`http://127.0.0.1:${String(port)}/api/sessions/campaigns/main-test`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: '{"formatVersion":1}',
    });
    const saved: unknown = JSON.parse(
      readFileSync(join(scratch, "data", "campaigns", "main-test", "campaign.json"), "utf8"),
    );

    expect(saved).toEqual({ formatVersion: 1 });
  });

  it("given an invalid PORT when running main then it fails with an error and a solution", async () => {
    const lines: string[] = [];

    const result = await main({
      env: { PORT: "abc" },
      paths: NO_ENV,
      log: (line) => lines.push(line),
    });

    expect({ result, lines }).toEqual({
      result: { ok: false, app: undefined },
      lines: [
        'Erro: PORT inválido: "abc" (use um inteiro de 0 a 65535) — Solução: corrija PORT no ambiente ou no .env (vazio = valor padrão).',
      ],
    });
  });

  it("given no repository around the server when running main then it says so and starts nothing", async () => {
    const lines: string[] = [];

    const result = await main({
      env: { PORT: "0" },
      paths: { ok: false, error: "Erro: sem repositório — Solução: rode na raiz." },
      log: (line) => lines.push(line),
    });

    expect({ result, lines }).toEqual({
      result: { ok: false, app: undefined },
      lines: ["Erro: sem repositório — Solução: rode na raiz."],
    });
  });

  it("given a key in the environment when running main then no printed line contains it", async () => {
    const lines: string[] = [];

    closeAfterTest(
      await main({
        env: { PORT: "0", OPENROUTER_API_KEY: FAKE_KEY },
        paths: NO_ENV,
        log: (line) => lines.push(line),
      }),
    );

    expect({ printed: lines.length, hasKey: lines.join("\n").includes(FAKE_KEY) }).toEqual({
      printed: 1,
      hasKey: false,
    });
  });

  it("given a log stream when the server handles a request then the request goes to that stream", async () => {
    const log = capturedLog();
    const result = closeAfterTest(
      await main({ env: { PORT: "0" }, paths: NO_ENV, log: () => undefined, logStream: log }),
    );
    assert.ok(result.ok);
    const port = Math.max(...listeningAddresses(result.app).map((address) => address.port));

    await fetch(`http://127.0.0.1:${String(port)}/api/health`);

    expect(jsonLines(log.lines)).toContainEqual(
      expect.objectContaining({ msg: "request completed", res: { statusCode: 200 } }),
    );
  });

  it("given the process when building the default options then they use its environment, this repository and stdout", () => {
    const root = gitTopLevel();

    expect(defaultMainOptions()).toMatchObject({
      env: process.env,
      paths: {
        ok: true,
        value: { root, webDistDir: join(root, "apps", "web", "dist"), envFile: join(root, ".env") },
      },
      logStream: process.stdout,
    });
  });

  it("given a line to log with the default options then it goes to the console", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    onTestFinished(() => {
      log.mockRestore();
    });

    defaultMainOptions().log("server line");

    expect(log.mock.calls).toEqual([["server line"]]);
  });
});
