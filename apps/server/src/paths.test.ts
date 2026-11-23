import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, parse, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { findWorkspaceRoot, repositoryPaths } from "./paths.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-paths-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** The repository root as git sees it: independent from how paths.ts finds it. */
function gitTopLevel(): string {
  const run = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return resolve(run.stdout.trim());
}

/** `root/package.json` declares workspaces; `root/apps/tool` is a package with `src/`. */
function monorepo(name: string): { root: string; source: string } {
  const root = join(scratch, name);
  const source = join(root, "apps", "tool", "src");
  mkdirSync(source, { recursive: true });
  writeFileSync(join(root, "package.json"), '{ "workspaces": ["apps/*"] }');
  writeFileSync(join(root, "apps", "tool", "package.json"), '{ "name": "tool" }');
  return { root, source };
}

describe("workspace root", () => {
  it("given a folder inside a workspace when finding the root then the nearest folder declaring workspaces is returned", () => {
    const { root, source } = monorepo("nested");

    expect(findWorkspaceRoot(source)).toBe(root);
  });

  it("given package.json files that are not objects on the way up when finding the root then they are skipped", () => {
    const root = join(scratch, "odd-manifests");
    const source = join(root, "a", "b", "src");
    mkdirSync(source, { recursive: true });
    writeFileSync(join(root, "package.json"), '{ "workspaces": ["a/*"] }');
    writeFileSync(join(root, "a", "package.json"), "null");
    writeFileSync(join(root, "a", "b", "package.json"), '"text"');

    expect(findWorkspaceRoot(source)).toBe(root);
  });

  it("given no workspace above a folder when finding the root then there is none", () => {
    expect(findWorkspaceRoot(parse(scratch).root)).toBeUndefined();
  });
});

describe("repository paths (overview §5)", () => {
  it("given a folder inside a workspace when locating the repository then the site and the .env hang from its root", () => {
    const { root, source } = monorepo("located");

    expect(repositoryPaths(source)).toEqual({
      ok: true,
      value: {
        root,
        webDistDir: join(root, "apps", "web", "dist"),
        envFile: join(root, ".env"),
      },
    });
  });

  it("given no workspace above a folder when locating the repository then it is an error with a solution", () => {
    const top = parse(scratch).root;

    expect(repositoryPaths(top)).toEqual({
      ok: false,
      error: `Erro: raiz do repositório (package.json com workspaces) não encontrada acima de ${top} — Solução: rode o servidor de dentro do repositório, por exemplo com npm start na raiz.`,
    });
  });

  it("given this repository when locating it from the server code then the paths match the root git reports", () => {
    const root = gitTopLevel();

    expect(repositoryPaths()).toEqual({
      ok: true,
      value: {
        root,
        webDistDir: join(root, "apps", "web", "dist"),
        envFile: join(root, ".env"),
      },
    });
  });
});
