/**
 * Where the server finds the repository: the root is the nearest ancestor whose
 * `package.json` declares npm workspaces, so the paths hold wherever the code
 * runs from (the repository itself or a copy made by a tool, like Stryker's
 * sandbox inside the package).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function declaresWorkspaces(folder: string): boolean {
  const manifest = join(folder, "package.json");
  if (!existsSync(manifest)) {
    return false;
  }
  const parsed: unknown = JSON.parse(readFileSync(manifest).toString());
  return typeof parsed === "object" && parsed !== null && "workspaces" in parsed;
}

/**
 * The nearest folder, from `start` up, whose `package.json` declares workspaces.
 *
 * @throws Error when there is none: the server only runs inside the repository.
 */
export function findWorkspaceRoot(start: string): string {
  const folder = resolve(start);
  if (declaresWorkspaces(folder)) {
    return folder;
  }
  const parent = dirname(folder);
  if (parent === folder) {
    throw new Error(`no npm workspace root above ${start}`);
  }
  return findWorkspaceRoot(parent);
}

/** The repository root (npm workspace root). */
export const REPO_ROOT = findWorkspaceRoot(dirname(fileURLToPath(import.meta.url)));

/** Where `npm run build` writes the site. */
export const WEB_DIST_DIR = join(REPO_ROOT, "apps", "web", "dist");

/** The `.env` of the repository root (ai-integration §2). */
export const ROOT_ENV_FILE = join(REPO_ROOT, ".env");
