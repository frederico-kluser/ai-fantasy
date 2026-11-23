import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  devProcesses,
  runTogether,
  startProcess,
  type DevProcess,
  type ProcessHandle,
} from "./dev.ts";

const ROOT = join("C:", "repo");
const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-dev-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

interface FakeHandle extends ProcessHandle {
  readonly name: string;
  exit: (code: number) => void;
  stopped: boolean;
}

function fakeStarter(): { start: (devProcess: DevProcess) => FakeHandle; handles: FakeHandle[] } {
  const handles: FakeHandle[] = [];
  const start = (devProcess: DevProcess): FakeHandle => {
    const listeners: ((code: number) => void)[] = [];
    const handle: FakeHandle = {
      name: devProcess.name,
      stopped: false,
      onExit: (listener) => listeners.push(listener),
      stop: () => {
        handle.stopped = true;
      },
      exit: (code) => {
        listeners.forEach((listener) => {
          listener(code);
        });
      },
    };
    handles.push(handle);
    return handle;
  };
  return { start, handles };
}

function script(name: string, source: string): DevProcess {
  const file = join(scratch, name);
  writeFileSync(file, source);
  return { name, args: [file], cwd: scratch };
}

describe("development processes", () => {
  it("given the repository root when listing the processes then the server runs with --watch and Vite runs in apps/web", () => {
    expect(devProcesses(ROOT)).toEqual([
      {
        name: "server",
        args: ["--watch", join(ROOT, "apps", "server", "src", "main.ts")],
        cwd: ROOT,
      },
      {
        name: "web",
        args: [join(ROOT, "node_modules", "vite", "bin", "vite.js")],
        cwd: join(ROOT, "apps", "web"),
      },
    ]);
  });

  it("given two running processes when one exits then the other is stopped and its exit code is returned", async () => {
    const { start, handles } = fakeStarter();
    const lines: string[] = [];

    const running = runTogether(devProcesses(ROOT), start, (line) => lines.push(line));
    handles[1]?.exit(3);

    expect({
      code: await running,
      stopped: handles.map((handle) => [handle.name, handle.stopped]),
      lines,
    }).toEqual({
      code: 3,
      stopped: [
        ["server", true],
        ["web", true],
      ],
      lines: ["web terminou (código 3); encerrando os demais processos."],
    });
  });

  it("given a process exits after another already did when running then the first exit code wins", async () => {
    const { start, handles } = fakeStarter();

    const running = runTogether(devProcesses(ROOT), start, () => undefined);
    handles[0]?.exit(0);
    handles[1]?.exit(9);

    expect(await running).toBe(0);
  });
});

describe("starting a real process", () => {
  it("given a script that exits with 4 when started then its exit is reported with 4", async () => {
    const handle = startProcess(script("exit-four.mjs", "process.exitCode = 4;\n"));

    const code = await new Promise<number>((resolve) => {
      handle.onExit(resolve);
    });

    expect(code).toBe(4);
  });

  it("given a long-running script when stopping it then its exit is reported", async () => {
    const handle = startProcess(script("forever.mjs", "setInterval(() => undefined, 1000);\n"));
    const exited = new Promise<number>((resolve) => {
      handle.onExit(resolve);
    });

    handle.stop();

    await expect(exited).resolves.toEqual(expect.any(Number));
  });
});
