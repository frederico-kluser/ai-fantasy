import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it, onTestFinished, vi } from "vitest";

import { capturedLog, configFor, FAKE_KEY, jsonLines } from "../test/support.ts";
import { defaultMainOptions, main, type MainResult } from "./main.ts";
import { ROOT_ENV_FILE } from "./paths.ts";
import { listeningAddresses, startServer } from "./server.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-main-"));
const MISSING_ENV_FILE = join(scratch, "missing.env");
const VARIABLE = "AI_FANTASY_MAIN_TEST_VARIABLE";

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** A port that was free a moment ago: listen on 0, read the port, close. */
async function freePort(): Promise<number> {
  const probe = await startServer({
    config: configFor({ PORT: "0", DATA_DIR: scratch }),
    webDistDir: scratch,
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

describe("server entry point", () => {
  it("given a PORT when running main then the server listens on 127.0.0.1 at that port and says where", async () => {
    const port = await freePort();
    const lines: string[] = [];

    const result = closeAfterTest(
      await main({
        env: { PORT: String(port), DATA_DIR: scratch },
        envFile: MISSING_ENV_FILE,
        log: (line) => lines.push(line),
      }),
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

    closeAfterTest(
      await main({ env: { PORT: "0", DATA_DIR: scratch }, envFile, log: () => undefined }),
    );

    expect(process.env[VARIABLE]).toBe("loaded");
  });

  it("given an invalid PORT when running main then it fails with an error and a solution", async () => {
    const lines: string[] = [];

    const result = await main({
      env: { PORT: "abc" },
      envFile: MISSING_ENV_FILE,
      log: (line) => lines.push(line),
    });

    expect({ result, lines }).toEqual({
      result: { ok: false, app: undefined },
      lines: [
        'Erro: PORT inválido: "abc" (use um inteiro de 0 a 65535) — Solução: corrija PORT no ambiente ou no .env (vazio = valor padrão).',
      ],
    });
  });

  it("given a key in the environment when running main then no printed line contains it", async () => {
    const lines: string[] = [];

    closeAfterTest(
      await main({
        env: { PORT: "0", DATA_DIR: scratch, OPENROUTER_API_KEY: FAKE_KEY },
        envFile: MISSING_ENV_FILE,
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
      await main({
        env: { PORT: "0", DATA_DIR: scratch },
        envFile: MISSING_ENV_FILE,
        log: () => undefined,
        logStream: log,
      }),
    );
    assert.ok(result.ok);
    const port = Math.max(...listeningAddresses(result.app).map((address) => address.port));

    await fetch(`http://127.0.0.1:${String(port)}/api/health`);

    expect(jsonLines(log.lines)).toContainEqual(
      expect.objectContaining({ msg: "request completed", res: { statusCode: 200 } }),
    );
  });

  it("given the process when building the default options then they use its environment, the root .env and stdout", () => {
    expect(defaultMainOptions()).toMatchObject({
      env: process.env,
      envFile: ROOT_ENV_FILE,
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
