/**
 * `npm run dev`: the local server (`node --watch`, port 4318) and the Vite dev
 * server (127.0.0.1:5173, `/api` forwarded to the server) side by side. When one
 * of them stops, the other is stopped too. No extra dependency: plain
 * `child_process` with the current Node.js binary, so it works on any platform.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

/** A Node.js process of the development setup. */
export interface DevProcess {
  readonly name: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

/** The part of a running process that {@link runTogether} needs. */
export interface ProcessHandle {
  readonly onExit: (listener: (code: number) => void) => void;
  readonly stop: () => void;
}

/** The server with `--watch` and Vite in `apps/web`. */
export function devProcesses(root: string): DevProcess[] {
  return [
    {
      name: "server",
      args: ["--watch", join(root, "apps", "server", "src", "main.ts")],
      cwd: root,
    },
    {
      name: "web",
      args: [join(root, "node_modules", "vite", "bin", "vite.js")],
      cwd: join(root, "apps", "web"),
    },
  ];
}

/** Starts a process with the current Node.js binary, sharing the terminal. */
export function startProcess(devProcess: DevProcess): ProcessHandle {
  const child = spawn(process.execPath, [...devProcess.args], {
    cwd: devProcess.cwd,
    stdio: "inherit",
  });
  return {
    onExit: (listener) => {
      child.on("exit", (code) => {
        listener(code ?? 1);
      });
    },
    stop: () => {
      child.kill();
    },
  };
}

/**
 * Starts every process; when the first one exits, stops the others and resolves
 * with its exit code.
 */
export function runTogether(
  processes: readonly DevProcess[],
  start: (devProcess: DevProcess) => ProcessHandle,
  log: (line: string) => void,
): Promise<number> {
  return new Promise((resolve) => {
    const handles = processes.map((devProcess) => ({ devProcess, handle: start(devProcess) }));
    let finished = false;
    for (const { devProcess, handle } of handles) {
      handle.onExit((code) => {
        if (finished) {
          return;
        }
        finished = true;
        log(
          `${devProcess.name} terminou (código ${String(code)}); encerrando os demais processos.`,
        );
        handles.forEach((entry) => {
          entry.handle.stop();
        });
        resolve(code);
      });
    }
  });
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run dev` */
if (import.meta.main) {
  process.exitCode = await runTogether(devProcesses(process.cwd()), startProcess, console.log);
}
/* v8 ignore stop -- @preserve */
