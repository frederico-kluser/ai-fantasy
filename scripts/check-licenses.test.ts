import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, onTestFinished, vi } from "vitest";

import {
  checkLicenses,
  defaultIo,
  lockedPackages,
  main,
  parsePolicy,
  satisfies,
  type LicensePolicy,
  type LockedPackage,
} from "./check-licenses.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ADR_0019 = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "Zlib",
  "Unicode-3.0",
  "BlueOak-1.0.0",
];

const POLICY: LicensePolicy = {
  production: ["MIT", "Apache-2.0", "ISC"],
  developmentExtra: ["CC-BY-4.0"],
  exceptions: [
    {
      package: "lint-tool",
      license: "LGPL-3.0-only",
      scope: "development",
      reason: "Lint tool, never distributed.",
    },
  ],
};

function pkg(name: string, license: string | undefined, dev = false): LockedPackage {
  return { name, version: "1.0.0", license, dev };
}

function lockfile(packages: Record<string, unknown>): string {
  return JSON.stringify({ name: "fixture", lockfileVersion: 3, packages });
}

function run(lock: string, policy: unknown = POLICY): { code: number; output: string } {
  const files = new Map([
    ["package-lock.json", lock],
    ["license-policy.json", JSON.stringify(policy)],
  ]);
  const lines: string[] = [];
  const code = main([], {
    readText: (path) => files.get(basename(path)),
    log: (line) => lines.push(line),
  });
  return { code, output: lines.join("\n") };
}

describe("SPDX expressions", () => {
  const allowed = new Set(["MIT", "Apache-2.0"]);

  it.each([
    ["MIT", true],
    ["GPL-3.0-only", false],
    ["(MIT OR GPL-3.0-only)", true],
    ["(GPL-3.0-only OR AGPL-3.0-only)", false],
    ["MIT AND Apache-2.0", true],
    ["MIT AND GPL-3.0-only", false],
    ["(MIT AND (Apache-2.0 OR GPL-2.0-only))", true],
    ["Apache-2.0 WITH LLVM-exception", true],
    ["GPL-2.0-only WITH Classpath-exception-2.0", false],
    ["mit or gpl-3.0-only", true],
    ["SEE LICENSE IN LICENSE.md", false],
    ["(MIT", false],
    ["MIT OR", false],
    ["MIT WITH", false],
    ["", false],
  ])("given %j when checking against MIT and Apache-2.0 then it is %s", (expression, expected) => {
    expect(satisfies(expression, allowed)).toBe(expected);
  });
});

describe("lockfile packages", () => {
  it("given the root entry and workspace links when listing then they are skipped", () => {
    const listed = lockedPackages(
      JSON.parse(
        lockfile({
          "": { name: "fixture" },
          "node_modules/@ai-fantasy/engine": { resolved: "packages/engine", link: true },
          "node_modules/a": { version: "1.0.0", license: "MIT" },
        }),
      ),
    );

    expect(listed).toEqual({
      ok: true,
      value: [{ name: "a", version: "1.0.0", license: "MIT", dev: false }],
    });
  });

  it("given nested and scoped paths, workspaces and license objects when listing then names and licenses are read", () => {
    const listed = lockedPackages(
      JSON.parse(
        lockfile({
          "node_modules/a/node_modules/@scope/b": { version: "2.0.0", license: "ISC", dev: true },
          "packages/engine": { name: "@ai-fantasy/engine", version: "0.0.0", license: "MIT" },
          "node_modules/c": { version: "3.0.0", license: { type: "BSD-3-Clause" } },
          "node_modules/d": {},
        }),
      ),
    );

    expect(listed).toEqual({
      ok: true,
      value: [
        { name: "@scope/b", version: "2.0.0", license: "ISC", dev: true },
        { name: "@ai-fantasy/engine", version: "0.0.0", license: "MIT", dev: false },
        { name: "c", version: "3.0.0", license: "BSD-3-Clause", dev: false },
        { name: "d", version: "", license: undefined, dev: false },
      ],
    });
  });

  it.each([null, [], { lockfileVersion: 1, packages: {} }, { lockfileVersion: 3 }])(
    "given %j when listing then it is an error",
    (lock) => {
      expect(lockedPackages(lock)).toEqual({
        ok: false,
        error: "package-lock.json não está no formato v2/v3 do npm (campo packages)",
      });
    },
  );
});

describe("license policy", () => {
  it("given the project policy when reading the production list then it is exactly the ADR 0019 list", () => {
    const policy = parsePolicy(
      JSON.parse(readFileSync(`${repoRoot}scripts/license-policy.json`, "utf8")),
    );

    expect(policy).toMatchObject({ ok: true, value: { production: ADR_0019 } });
  });

  it.each([
    null,
    { production: "MIT", developmentExtra: [], exceptions: [] },
    { production: [], developmentExtra: [1], exceptions: [] },
    { production: [], developmentExtra: [], exceptions: [{ package: "a" }] },
    {
      production: [],
      developmentExtra: [],
      exceptions: [{ package: "a", license: "X", scope: "everywhere", reason: "r" }],
    },
  ])("given the invalid policy %j when reading it then it is an error", (raw) => {
    expect(parsePolicy(raw)).toEqual({
      ok: false,
      error: "license-policy.json inválido: production, developmentExtra e exceptions",
    });
  });
});

describe("checking licenses (ADR 0019)", () => {
  it("given a production dependency under GPL when checking then it is a violation", () => {
    const result = checkLicenses([pkg("good", "MIT"), pkg("copyleft", "GPL-3.0-only")], POLICY);

    expect(result.violations).toEqual([
      { name: "copyleft", version: "1.0.0", license: "GPL-3.0-only", scope: "production" },
    ]);
  });

  it("given a development-only dependency under an extra license when checking then it is allowed", () => {
    const result = checkLicenses([pkg("data", "CC-BY-4.0", true)], POLICY);

    expect(result.violations).toEqual([]);
  });

  it("given a production dependency under a development-only license when checking then it is a violation", () => {
    const result = checkLicenses([pkg("data", "CC-BY-4.0")], POLICY);

    expect(result.violations.map((violation) => violation.name)).toEqual(["data"]);
  });

  it("given a dependency without license when checking then it is a violation", () => {
    const result = checkLicenses([pkg("mystery", undefined, true)], POLICY);

    expect(result.violations).toEqual([
      { name: "mystery", version: "1.0.0", license: "(sem licença)", scope: "development" },
    ]);
  });

  it("given an exception for a development-only package when it is used in development then it is allowed", () => {
    const result = checkLicenses([pkg("lint-tool", "LGPL-3.0-only", true)], POLICY);

    expect(result).toEqual({
      violations: [],
      usedExceptions: POLICY.exceptions,
      unusedExceptions: [],
    });
  });

  it("given an exception for a development-only package when it reaches production then it is a violation", () => {
    const result = checkLicenses([pkg("lint-tool", "LGPL-3.0-only")], POLICY);

    expect(result.violations.map((violation) => violation.scope)).toEqual(["production"]);
  });

  it("given an exception whose license no longer matches when checking then it is a violation", () => {
    const result = checkLicenses([pkg("lint-tool", "GPL-3.0-only", true)], POLICY);

    expect(result.violations.map((violation) => violation.license)).toEqual(["GPL-3.0-only"]);
  });

  it("given an exception for a package that is not installed when checking then it is reported as unused", () => {
    const result = checkLicenses([pkg("good", "MIT")], POLICY);

    expect(result.unusedExceptions).toEqual(POLICY.exceptions);
  });

  it("given an exception for a package without license when checking then it is allowed", () => {
    const policy: LicensePolicy = {
      ...POLICY,
      exceptions: [{ package: "mystery", license: null, scope: "all", reason: "MIT in LICENSE." }],
    };

    const result = checkLicenses([pkg("mystery", undefined)], policy);

    expect(result.violations).toEqual([]);
  });
});

describe("command line", () => {
  it("given a lockfile with a GPL production dependency when running then it exits with 1 and names it", () => {
    const { code, output } = run(
      lockfile({ "node_modules/copyleft": { version: "1.2.3", license: "GPL-3.0-only" } }),
    );

    expect({ code, output }).toEqual({
      code: 1,
      output: expect.stringContaining("copyleft@1.2.3: GPL-3.0-only (produção)") as unknown,
    });
  });

  it("given a lockfile with allowed licenses when running then it exits with 0 and counts the packages", () => {
    const { code, output } = run(
      lockfile({
        "node_modules/a": { version: "1.0.0", license: "MIT" },
        "node_modules/b": { version: "1.0.0", license: "CC-BY-4.0", dev: true },
        "node_modules/lint-tool": { version: "1.0.0", license: "LGPL-3.0-only", dev: true },
      }),
    );

    expect({ code, output }).toEqual({
      code: 0,
      output: [
        "Licenças: 3 pacotes verificados (1 de produção, 2 só de desenvolvimento).",
        "Exceção usada: lint-tool (LGPL-3.0-only, development) — Lint tool, never distributed.",
        "Licenças conforme a política (ADR 0019).",
      ].join("\n"),
    });
  });

  it("given an unused exception when running then it warns without failing", () => {
    const { code, output } = run(
      lockfile({ "node_modules/a": { version: "1.0.0", license: "MIT" } }),
    );

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining(
        "Aviso: exceção sem uso em scripts/license-policy.json: lint-tool",
      ) as unknown,
    });
  });

  it("given a broken lockfile when running then it exits with 1 and explains", () => {
    const { code, output } = run("{ not json");

    expect({ code, output }).toEqual({
      code: 1,
      output: expect.stringMatching(/^Erro: não foi possível ler package-lock\.json/) as unknown,
    });
  });

  it("given no lockfile when running then it exits with 1 and says how to create it", () => {
    const lines: string[] = [];

    const code = main([], { readText: () => undefined, log: (line) => lines.push(line) });

    expect({ code, lines }).toEqual({
      code: 1,
      lines: ["Erro: package-lock.json não encontrado — Solução: rode npm install na raiz."],
    });
  });

  it("given a policy file that is not JSON when running then it exits with 1 and explains", () => {
    const files = new Map([
      ["package-lock.json", lockfile({})],
      ["license-policy.json", "not json"],
    ]);
    const lines: string[] = [];

    const code = main([], {
      readText: (path) => files.get(basename(path)),
      log: (line) => lines.push(line),
    });

    expect({ code, lines }).toEqual({
      code: 1,
      lines: [expect.stringMatching(/^Erro: não foi possível ler scripts\/license-policy\.json/)],
    });
  });

  it("given an invalid policy when running then it exits with 1 and explains", () => {
    const { code, output } = run(lockfile({}), { production: "MIT" });

    expect({ code, output }).toEqual({
      code: 1,
      output:
        "Erro: license-policy.json inválido: production, developmentExtra e exceptions — Solução: corrija scripts/license-policy.json.",
    });
  });

  it("given a lockfile in an unknown format when running then it exits with 1 and explains", () => {
    const { code, output } = run(JSON.stringify({ lockfileVersion: 1 }));

    expect({ code, output }).toEqual({
      code: 1,
      output:
        "Erro: package-lock.json não está no formato v2/v3 do npm (campo packages) — Solução: gere o lockfile com npm 7 ou mais novo (npm install).",
    });
  });
});

describe("the repository", () => {
  it("given the repository lockfile when checking with the project policy then every license is allowed", () => {
    const lock = readFileSync(`${repoRoot}package-lock.json`, "utf8");
    const policy: unknown = JSON.parse(
      readFileSync(`${repoRoot}scripts/license-policy.json`, "utf8"),
    );

    expect(run(lock, policy).code).toBe(0);
  });
});

describe("default wiring", () => {
  it("given a path relative to the root when reading through the default io then the file is read", () => {
    expect(defaultIo(repoRoot).readText("package-lock.json")).toContain('"lockfileVersion": 3');
  });

  it("given a file that does not exist when reading through the default io then nothing is returned", () => {
    expect(defaultIo(repoRoot).readText("no-such-lockfile.json")).toBeUndefined();
  });

  it("given a line to log when using the default io then it goes to the console", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    onTestFinished(() => {
      log.mockRestore();
    });

    defaultIo(repoRoot).log("license line");

    expect(log.mock.calls).toEqual([["license line"]]);
  });

  it("given the repository and the default io when running then the licenses pass", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    onTestFinished(() => {
      log.mockRestore();
    });

    expect(main([], defaultIo(repoRoot))).toBe(0);
  });
});
