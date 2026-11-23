import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it, onTestFinished, vi } from "vitest";

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
  const probe = await startServer({ port: 0, webDistDir: scratch });
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
        env: { PORT: String(port) },
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

    closeAfterTest(await main({ env: { PORT: "0" }, envFile, log: () => undefined }));

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
        'Erro: PORT inválido: "abc" (use um inteiro de 0 a 65535) — Solução: corrija PORT no ambiente ou no .env (padrão 4318).',
      ],
    });
  });

  it("given the process when building the default options then they use its environment and the root .env", () => {
    expect(defaultMainOptions()).toMatchObject({ env: process.env, envFile: ROOT_ENV_FILE });
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
