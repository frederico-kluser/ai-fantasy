import { fileURLToPath } from "node:url";

import { describe, expect, it, onTestFinished, vi } from "vitest";

import {
  defaultIo,
  main,
  mirrorDifference,
  REQUIRED_FILES,
  type GovernanceIo,
} from "./check-governance.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const CLAUDE = "# CLAUDE.md — contrato\n\nRegra 1.\nRegra 2.\n";
const AGENTS = "# AGENTS.md — contrato (espelho de CLAUDE.md)\n\nRegra 1.\nRegra 2.\n";

/** Every required file with content, plus the two contracts. */
function repository(
  overrides: Record<string, string | undefined> = {},
): Map<string, string | undefined> {
  const files = new Map<string, string | undefined>(
    REQUIRED_FILES.map((file) => [file, "conteúdo\n"]),
  );
  files.set("CLAUDE.md", CLAUDE);
  files.set("AGENTS.md", AGENTS);
  Object.entries(overrides).forEach(([file, content]) => files.set(file, content));
  return files;
}

function run(files: Map<string, string | undefined>): { code: number; lines: string[] } {
  const lines: string[] = [];
  const io: GovernanceIo = { readText: (path) => files.get(path), log: (line) => lines.push(line) };
  return { code: main([], io), lines };
}

describe("CLAUDE.md and AGENTS.md mirrors", () => {
  it("given contracts that differ only in the first line when comparing then they are mirrors", () => {
    expect(mirrorDifference(CLAUDE, AGENTS)).toBeUndefined();
  });

  it("given AGENTS.md diverging from CLAUDE.md after the first line when comparing then the first different line is reported", () => {
    expect(mirrorDifference(CLAUDE, AGENTS.replace("Regra 2.", "Regra dois."))).toBe(4);
  });

  it("given AGENTS.md shorter than CLAUDE.md when comparing then the first missing line is reported", () => {
    expect(mirrorDifference(CLAUDE, "# AGENTS.md\n\nRegra 1.\n")).toBe(4);
  });
});

describe("minimum governance (CI docs job)", () => {
  it("given the required files of the CI when reading the list then it is the same as before the monorepo", () => {
    expect(REQUIRED_FILES).toEqual([
      "LICENSE",
      "README.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      "CODEOWNERS",
      "CODE_OF_CONDUCT.md",
      "CLAUDE.md",
      "AGENTS.md",
      "GOVERNANCE.md",
      "docs/architecture/overview.md",
      "docs/engineering/development-rules.md",
      "docs/engineering/testing-strategy.md",
    ]);
  });

  it("given every required file and mirrored contracts when checking then it passes", () => {
    expect(run(repository())).toEqual({
      code: 0,
      lines: [
        "Governança mínima: 12 arquivos obrigatórios presentes; CLAUDE.md e AGENTS.md espelhados.",
      ],
    });
  });

  it("given a missing and an empty required file when checking then it fails naming both", () => {
    expect(run(repository({ "SECURITY.md": undefined, CODEOWNERS: " \n" }))).toEqual({
      code: 1,
      lines: [
        "Erro: governança mínima incompleta — Solução: restaure os arquivos e alinhe CLAUDE.md e AGENTS.md (só a primeira linha pode diferir).",
        "  - falta ou está vazio: SECURITY.md",
        "  - falta ou está vazio: CODEOWNERS",
      ],
    });
  });

  it("given AGENTS.md diverging from CLAUDE.md when checking then it fails with the line", () => {
    expect(run(repository({ "AGENTS.md": AGENTS.replace("Regra 1.", "Regra um.") }))).toEqual({
      code: 1,
      lines: [
        "Erro: governança mínima incompleta — Solução: restaure os arquivos e alinhe CLAUDE.md e AGENTS.md (só a primeira linha pode diferir).",
        "  - CLAUDE.md e AGENTS.md divergem a partir da linha 3",
      ],
    });
  });
});

describe("default wiring", () => {
  it("given the repository when checking with the default io then the governance passes", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    onTestFinished(() => {
      log.mockRestore();
    });

    expect({ code: main([], defaultIo(repoRoot)), logged: log.mock.calls.length }).toEqual({
      code: 0,
      logged: 1,
    });
  });

  it("given a file that does not exist when reading through the default io then nothing is returned", () => {
    expect(defaultIo(repoRoot).readText("NO-SUCH-FILE.md")).toBeUndefined();
  });
});
