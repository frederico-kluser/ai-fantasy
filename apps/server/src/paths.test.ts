import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, parse, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { findWorkspaceRoot, REPO_ROOT, ROOT_ENV_FILE, WEB_DIST_DIR } from "./paths.ts";

const scratch = mkdtempSync(join(tmpdir(), "ai-fantasy-paths-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/** The repository root as git sees it: independent from how paths.ts finds it. */
function gitTopLevel(): string {
  const run = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return resolve(run.stdout.trim());
}

describe("workspace root", () => {
  it("given a folder inside a workspace when finding the root then the nearest folder declaring workspaces is returned", () => {
    const root = join(scratch, "monorepo");
    const source = join(root, "apps", "tool", "src");
    mkdirSync(source, { recursive: true });
    writeFileSync(join(root, "package.json"), '{ "workspaces": ["apps/*"] }');
    writeFileSync(join(root, "apps", "tool", "package.json"), '{ "name": "tool" }');

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

  it("given no workspace above a folder when finding the root then it fails with a clear error", () => {
    const top = parse(scratch).root;

    expect(() => findWorkspaceRoot(top)).toThrow(`no npm workspace root above ${top}`);
  });
});

describe("repository paths (overview §5)", () => {
  it("given the repository when locating it then the root is the one git reports", () => {
    expect(REPO_ROOT).toBe(gitTopLevel());
  });

  it("given the repository when locating the built site then it is apps/web/dist under the root", () => {
    expect(WEB_DIST_DIR).toBe(join(gitTopLevel(), "apps", "web", "dist"));
  });

  it("given the repository when locating the .env file then it is at the root", () => {
    expect(ROOT_ENV_FILE).toBe(join(gitTopLevel(), ".env"));
  });
});
