import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it, onTestFinished, vi } from "vitest";

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

/** Repository paths for a test: a scratch root, an `.env` and a site folder. */
function paths(envFile: string, webDistDir: string = emptySite): PathsResult {
  return { ok: true, value: { root: scratch, envFile, webDistDir } };
}

const NO_ENV = paths(join(scratch, "missing.env"));

/** A port that was free a moment ago: listen on 0, read the port, close. */
async function freePort(): Promise<number> {
  const probe = await startServer({ port: 0, webDistDir: emptySite });
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
        'Erro: PORT inválido: "abc" (use um inteiro de 0 a 65535) — Solução: corrija PORT no ambiente ou no .env (padrão 4318).',
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

  it("given the process when building the default options then they use its environment and this repository", () => {
    const root = gitTopLevel();

    expect(defaultMainOptions()).toMatchObject({
      env: process.env,
      paths: {
        ok: true,
        value: { root, webDistDir: join(root, "apps", "web", "dist"), envFile: join(root, ".env") },
      },
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
