/**
 * Checks the package dependency table of docs/architecture/overview.md §2 on the
 * import statements of every production source file, and on the workspace
 * manifests. ESLint enforces the same table (eslint.config.js); this is the
 * second, independent check the overview asks for.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, posix } from "node:path";

import ts from "typescript";

/** A source file with its repository-relative POSIX path. */
export interface SourceFile {
  readonly path: string;
  readonly source: string;
}

/** A workspace `package.json`, reduced to what the table needs. */
export interface Manifest {
  readonly path: string;
  readonly name: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

/** One broken rule of the dependency table. */
export interface Violation {
  readonly file: string;
  readonly specifier: string;
  readonly reason: string;
}

/** What one area of the code (a package or part of it) may import. */
interface Area {
  readonly name: string;
  readonly packageRoot: string;
  readonly sourceRoot: string;
  readonly internal: readonly string[];
  readonly builtins: boolean;
  readonly openrouter: boolean;
  readonly forbidden: readonly string[];
}

const ADAPTERS_ROOT = "packages/ai/src/openrouter/";

/** overview §2, as data. More specific areas come first. */
const AREAS: readonly Area[] = [
  {
    name: "ai (openrouter)",
    packageRoot: "packages/ai/",
    sourceRoot: ADAPTERS_ROOT,
    internal: ["@ai-fantasy/engine", "@ai-fantasy/ai"],
    builtins: true,
    openrouter: true,
    forbidden: ["react", "react-dom"],
  },
  {
    name: "ai (pure)",
    packageRoot: "packages/ai/",
    sourceRoot: "packages/ai/src/",
    internal: ["@ai-fantasy/engine"],
    builtins: false,
    openrouter: false,
    forbidden: ["react", "react-dom", "fastify"],
  },
  {
    name: "engine",
    packageRoot: "packages/engine/",
    sourceRoot: "packages/engine/src/",
    internal: [],
    builtins: false,
    openrouter: false,
    forbidden: ["react", "react-dom", "fastify"],
  },
  {
    name: "server",
    packageRoot: "apps/server/",
    sourceRoot: "apps/server/src/",
    internal: ["@ai-fantasy/engine", "@ai-fantasy/ai", "@ai-fantasy/ai/openrouter"],
    builtins: true,
    openrouter: true,
    forbidden: ["react", "react-dom"],
  },
  {
    name: "web",
    packageRoot: "apps/web/",
    sourceRoot: "apps/web/src/",
    internal: ["@ai-fantasy/engine", "@ai-fantasy/ai"],
    builtins: false,
    openrouter: false,
    forbidden: ["fastify"],
  },
];

/** Internal dependencies each workspace manifest may declare (overview §2). */
const MANIFEST_TABLE: Readonly<Record<string, readonly string[]>> = {
  "@ai-fantasy/engine": [],
  "@ai-fantasy/ai": ["@ai-fantasy/engine"],
  "@ai-fantasy/server": ["@ai-fantasy/engine", "@ai-fantasy/ai"],
  "@ai-fantasy/web": ["@ai-fantasy/engine", "@ai-fantasy/ai"],
};

const BUILTINS = new Set(builtinModules);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;
const OPENROUTER_SEGMENT = /(^|\/)openrouter(\/|$)/;

function areaOf(path: string): Area | undefined {
  if (TEST_FILE.test(path)) {
    return undefined;
  }
  return AREAS.find((area) => path.startsWith(area.sourceRoot));
}

/** Every module specifier of a file: static, dynamic, re-export and `require`. */
function importsOf(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((entry) => entry.fileName);
}

function isBuiltin(specifier: string): boolean {
  return specifier.startsWith("node:") || BUILTINS.has(specifier);
}

/** `react-dom/client` → `react-dom`; `@scope/name/sub` → `@scope/name`. */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  const length = specifier.startsWith("@") ? 2 : 1;
  return parts.slice(0, length).join("/");
}

function checkRelative(area: Area, path: string, specifier: string): string | undefined {
  const target = posix.normalize(posix.join(posix.dirname(path), specifier));
  if (!target.startsWith(area.packageRoot)) {
    return `${area.name} may not reach outside ${area.packageRoot.slice(0, -1)}`;
  }
  if (!area.openrouter && target.startsWith(ADAPTERS_ROOT)) {
    return `${area.name} may not use the OpenRouter adapters`;
  }
  return undefined;
}

function checkPackage(area: Area, specifier: string): string | undefined {
  if (!area.openrouter && OPENROUTER_SEGMENT.test(specifier)) {
    return `${area.name} may not use the OpenRouter adapters`;
  }
  if (specifier.startsWith("@ai-fantasy/") && !area.internal.includes(specifier)) {
    return `${area.name} may not import ${specifier}`;
  }
  if (area.forbidden.includes(packageName(specifier))) {
    return `${area.name} may not import ${packageName(specifier)}`;
  }
  return undefined;
}

function checkSpecifier(area: Area, path: string, specifier: string): string | undefined {
  if (isBuiltin(specifier)) {
    return area.builtins ? undefined : `${area.name} may not import Node.js built-ins`;
  }
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return checkRelative(area, path, specifier);
  }
  return checkPackage(area, specifier);
}

/**
 * Finds the imports that break the dependency table of overview §2.
 * Test files and files outside `packages/*\/src` and `apps/*\/src` are ignored.
 */
export function findViolations(files: readonly SourceFile[]): Violation[] {
  return files.flatMap((entry) => {
    const area = areaOf(entry.path);
    if (area === undefined) {
      return [];
    }
    return importsOf(entry.source).flatMap((specifier) => {
      const reason = checkSpecifier(area, entry.path, specifier);
      return reason === undefined ? [] : [{ file: entry.path, specifier, reason }];
    });
  });
}

function declaredInternal(manifest: Manifest): string[] {
  const groups = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
    manifest.optionalDependencies,
  ];
  return groups
    .flatMap((group) => Object.keys(group ?? {}))
    .filter((name) => name.startsWith("@ai-fantasy/"));
}

/** Finds workspace manifests that declare internal dependencies the table forbids. */
export function findManifestViolations(manifests: readonly Manifest[]): Violation[] {
  return manifests.flatMap((manifest) => {
    const allowed = MANIFEST_TABLE[manifest.name];
    if (allowed === undefined) {
      const reason = `${manifest.name} is not in the dependency table of overview §2`;
      return [{ file: manifest.path, specifier: manifest.name, reason }];
    }
    return declaredInternal(manifest)
      .filter((name) => !allowed.includes(name))
      .map((name) => ({
        file: manifest.path,
        specifier: name,
        reason: `${manifest.name} may not depend on ${name}`,
      }));
  });
}

function workspaceDirs(root: string): string[] {
  return ["packages", "apps"].flatMap((group) =>
    readdirSync(join(root, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${group}/${entry.name}`),
  );
}

function readSources(root: string, workspace: string): SourceFile[] {
  const sourceDir = join(root, workspace, "src");
  if (!existsSync(sourceDir)) {
    return [];
  }
  return readdirSync(sourceDir, { recursive: true, encoding: "utf8" })
    .map((relative) => `${workspace}/src/${relative.replaceAll("\\", "/")}`)
    .filter((path) => SOURCE_FILE.test(path) && !path.includes("/node_modules/"))
    .map((path) => ({ path, source: readFileSync(join(root, path), "utf8") }));
}

function readManifest(root: string, workspace: string): Manifest {
  const path = `${workspace}/package.json`;
  // The manifest is ours and npm already validated it; only the fields above are read.
  const parsed = JSON.parse(readFileSync(join(root, path), "utf8")) as Omit<Manifest, "path">;
  return { ...parsed, path };
}

/** Reads every workspace's production sources and manifest from disk. */
export function scanRepository(root: string): {
  files: SourceFile[];
  manifests: Manifest[];
} {
  const workspaces = workspaceDirs(root);
  return {
    files: workspaces.flatMap((workspace) => readSources(root, workspace)),
    manifests: workspaces.map((workspace) => readManifest(root, workspace)),
  };
}
