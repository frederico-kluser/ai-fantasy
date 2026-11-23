/**
 * Where the server finds the repository: the root is the nearest ancestor whose
 * `package.json` declares npm workspaces, so the paths hold wherever the code
 * runs from (the repository itself or a copy made by a tool, like Stryker's
 * sandbox inside the package). Nothing is computed when the module loads.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository folders and files the server uses. */
export interface RepositoryPaths {
  readonly root: string;
  /** Where `npm run build` writes the site. */
  readonly webDistDir: string;
  /** The `.env` of the repository root (ai-integration §2). */
  readonly envFile: string;
}

/** The repository paths, or why the repository was not found. */
export type PathsResult =
  | { readonly ok: true; readonly value: RepositoryPaths }
  | { readonly ok: false; readonly error: string };

function declaresWorkspaces(folder: string): boolean {
  const manifest = join(folder, "package.json");
  if (!existsSync(manifest)) {
    return false;
  }
  const parsed: unknown = JSON.parse(readFileSync(manifest).toString());
  return typeof parsed === "object" && parsed !== null && "workspaces" in parsed;
}

/** The nearest folder, from `start` up, whose `package.json` declares workspaces. */
export function findWorkspaceRoot(start: string): string | undefined {
  const folder = resolve(start);
  if (declaresWorkspaces(folder)) {
    return folder;
  }
  const parent = dirname(folder);
  return parent === folder ? undefined : findWorkspaceRoot(parent);
}

/**
 * Locates the repository from `start` (by default, this module's folder).
 *
 * @returns the root, the built site folder and the `.env` file, or an
 *   `Erro: … — Solução: …` message when no workspace root is above `start`.
 */
export function repositoryPaths(
  start: string = dirname(fileURLToPath(import.meta.url)),
): PathsResult {
  const root = findWorkspaceRoot(start);
  if (root === undefined) {
    return {
      ok: false,
      error: `Erro: raiz do repositório (package.json com workspaces) não encontrada acima de ${start} — Solução: rode o servidor de dentro do repositório, por exemplo com npm start na raiz.`,
    };
  }
  return {
    ok: true,
    value: { root, webDistDir: join(root, "apps", "web", "dist"), envFile: join(root, ".env") },
  };
}
