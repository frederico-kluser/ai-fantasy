/**
 * License gate (ADR 0019; criteria in the implementation note of ADR 0020).
 *
 * Reads `package-lock.json` (npm v2/v3) and checks every installed package:
 * production dependencies may only use the ADR 0019 list; development-only ones
 * (never distributed) may also use the extras of `scripts/license-policy.json`.
 * A missing or unknown license fails unless an explicit exception with a reason
 * covers that package and license.
 *
 * Usage: `npm run licenses` (exit 1 when a license is outside the policy).
 */
import { fileURLToPath } from "node:url";

import { readTextFile } from "./lib/io.ts";
import type { Result } from "./lib/result.ts";

/** The license policy stored in `scripts/license-policy.json`. */
export interface LicensePolicy {
  readonly production: readonly string[];
  readonly developmentExtra: readonly string[];
  readonly exceptions: readonly LicenseException[];
}

/** An explicit, justified exception for one package and one license. */
export interface LicenseException {
  readonly package: string;
  /** The exact `license` of the lockfile, or `null` for a package without one. */
  readonly license: string | null;
  /** `development`: valid only while the package is development-only. */
  readonly scope: "development" | "all";
  readonly reason: string;
}

/** One installed package, as the lockfile describes it. */
export interface LockedPackage {
  readonly name: string;
  readonly version: string;
  readonly license: string | undefined;
  readonly dev: boolean;
}

/** A package whose license the policy does not allow. */
export interface LicenseViolation {
  readonly name: string;
  readonly version: string;
  readonly license: string;
  readonly scope: "production" | "development";
}

/** Outcome of {@link checkLicenses}. */
export interface LicenseCheck {
  readonly violations: readonly LicenseViolation[];
  readonly usedExceptions: readonly LicenseException[];
  readonly unusedExceptions: readonly LicenseException[];
}

/** What {@link main} needs from the outside world. */
export interface LicensesIo {
  /** Contents of a text file, or `undefined` when it does not exist. */
  readonly readText: (path: string) => string | undefined;
  readonly log: (line: string) => void;
}

// ---------------------------------------------------------------------------
// SPDX expressions: `A OR B`, `A AND B`, parentheses and `A WITH exception`.
// ---------------------------------------------------------------------------

interface Parsed {
  readonly ok: boolean;
  readonly value: boolean;
  readonly next: number;
}

const FAILED: Parsed = { ok: false, value: false, next: 0 };

function tokenize(expression: string): string[] {
  return expression
    .replaceAll("(", " ( ")
    .replaceAll(")", " ) ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function keyword(token: string | undefined): string {
  return (token ?? "").toUpperCase();
}

function isOperand(token: string | undefined): token is string {
  return (
    token !== undefined &&
    token !== "(" &&
    token !== ")" &&
    !["AND", "OR", "WITH"].includes(keyword(token))
  );
}

function parseAtom(tokens: readonly string[], at: number, allowed: ReadonlySet<string>): Parsed {
  if (tokens[at] === "(") {
    const inner = parseOr(tokens, at + 1, allowed);
    return inner.ok && tokens[inner.next] === ")" ? { ...inner, next: inner.next + 1 } : FAILED;
  }
  const license = tokens[at];
  if (!isOperand(license)) {
    return FAILED;
  }
  const value = allowed.has(license.toLowerCase());
  if (keyword(tokens[at + 1]) !== "WITH") {
    return { ok: true, value, next: at + 1 };
  }
  // An exception only adds permissions, so `A WITH e` is allowed when A is.
  return isOperand(tokens[at + 2]) ? { ok: true, value, next: at + 3 } : FAILED;
}

function parseChain(
  tokens: readonly string[],
  at: number,
  allowed: ReadonlySet<string>,
  operator: "AND" | "OR",
): Parsed {
  const operand = operator === "OR" ? parseAnd : parseAtom;
  let left = operand(tokens, at, allowed);
  while (left.ok && keyword(tokens[left.next]) === operator) {
    const right = operand(tokens, left.next + 1, allowed);
    const value = operator === "OR" ? left.value || right.value : left.value && right.value;
    left = { ok: right.ok, value, next: right.next };
  }
  return left;
}

function parseAnd(tokens: readonly string[], at: number, allowed: ReadonlySet<string>): Parsed {
  return parseChain(tokens, at, allowed, "AND");
}

function parseOr(tokens: readonly string[], at: number, allowed: ReadonlySet<string>): Parsed {
  return parseChain(tokens, at, allowed, "OR");
}

/**
 * Whether an SPDX license expression is satisfied by the allowed licenses
 * (case-insensitive). Invalid expressions are never satisfied.
 */
export function satisfies(expression: string, allowed: ReadonlySet<string>): boolean {
  const tokens = tokenize(expression);
  const lowered = new Set([...allowed].map((license) => license.toLowerCase()));
  const parsed = parseOr(tokens, 0, lowered);
  return parsed.ok && parsed.next === tokens.length && parsed.value;
}

// ---------------------------------------------------------------------------
// Lockfile and policy
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function licenseOf(entry: Record<string, unknown>): string | undefined {
  const license = entry["license"];
  if (typeof license === "string") {
    return license;
  }
  return isRecord(license) && typeof license["type"] === "string" ? license["type"] : undefined;
}

function nameOf(path: string, entry: Record<string, unknown>): string {
  const name = entry["name"];
  if (typeof name === "string") {
    return name;
  }
  return path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
}

function toPackage(path: string, entry: Record<string, unknown>): LockedPackage {
  const version = entry["version"];
  return {
    name: nameOf(path, entry),
    version: typeof version === "string" ? version : "",
    license: licenseOf(entry),
    dev: entry["dev"] === true,
  };
}

/** Lists the installed packages of an npm v2/v3 lockfile (no root, no workspace links). */
export function lockedPackages(lock: unknown): Result<LockedPackage[]> {
  const packages = isRecord(lock) ? lock["packages"] : undefined;
  if (!isRecord(lock) || !isRecord(packages) || Number(lock["lockfileVersion"]) < 2) {
    return {
      ok: false,
      error: "package-lock.json não está no formato v2/v3 do npm (campo packages)",
    };
  }
  const value = Object.entries(packages)
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .filter(([path, entry]) => path !== "" && entry["link"] !== true)
    .map(([path, entry]) => toPackage(path, entry));
  return { ok: true, value };
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isException(value: unknown): value is LicenseException {
  return (
    isRecord(value) &&
    typeof value["package"] === "string" &&
    (typeof value["license"] === "string" || value["license"] === null) &&
    (value["scope"] === "development" || value["scope"] === "all") &&
    typeof value["reason"] === "string"
  );
}

/** Validates the parsed contents of `scripts/license-policy.json`. */
export function parsePolicy(raw: unknown): Result<LicensePolicy> {
  if (
    !isRecord(raw) ||
    !isStringList(raw["production"]) ||
    !isStringList(raw["developmentExtra"]) ||
    !Array.isArray(raw["exceptions"]) ||
    !raw["exceptions"].every(isException)
  ) {
    return {
      ok: false,
      error: "license-policy.json inválido: production, developmentExtra e exceptions",
    };
  }
  const { production, developmentExtra, exceptions } = raw;
  return { ok: true, value: { production, developmentExtra, exceptions } };
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

function findException(
  item: LockedPackage,
  exceptions: readonly LicenseException[],
): LicenseException | undefined {
  return exceptions.find(
    (exception) =>
      exception.package === item.name &&
      exception.license === (item.license ?? null) &&
      (exception.scope === "all" || item.dev),
  );
}

type Verdict =
  | { readonly kind: "allowed" }
  | { readonly kind: "exception"; readonly exception: LicenseException }
  | { readonly kind: "violation"; readonly violation: LicenseViolation };

function judge(item: LockedPackage, policy: LicensePolicy): Verdict {
  const allowed = new Set(
    item.dev ? [...policy.production, ...policy.developmentExtra] : policy.production,
  );
  if (item.license !== undefined && satisfies(item.license, allowed)) {
    return { kind: "allowed" };
  }
  const exception = findException(item, policy.exceptions);
  if (exception !== undefined) {
    return { kind: "exception", exception };
  }
  const violation: LicenseViolation = {
    name: item.name,
    version: item.version,
    license: item.license ?? "(sem licença)",
    scope: item.dev ? "development" : "production",
  };
  return { kind: "violation", violation };
}

/** Checks every package against the policy. */
export function checkLicenses(
  packages: readonly LockedPackage[],
  policy: LicensePolicy,
): LicenseCheck {
  const verdicts = packages.map((item) => judge(item, policy));
  const violations = verdicts.flatMap((verdict) =>
    verdict.kind === "violation" ? [verdict.violation] : [],
  );
  const used = new Set(
    verdicts.flatMap((verdict) => (verdict.kind === "exception" ? [verdict.exception] : [])),
  );
  return {
    violations,
    usedExceptions: policy.exceptions.filter((exception) => used.has(exception)),
    unusedExceptions: policy.exceptions.filter((exception) => !used.has(exception)),
  };
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const POLICY_FILE = fileURLToPath(new URL("license-policy.json", import.meta.url));
const SCOPE_LABEL = { production: "produção", development: "desenvolvimento" } as const;

function readJson(io: LicensesIo, path: string, label: string): Result<unknown> {
  const text = io.readText(path);
  if (text === undefined) {
    return { ok: false, error: `${label} não encontrado — Solução: rode npm install na raiz.` };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      error: `não foi possível ler ${label} (${String(error)}) — Solução: regenere o arquivo.`,
    };
  }
}

function loadInputs(io: LicensesIo): Result<{ packages: LockedPackage[]; policy: LicensePolicy }> {
  const lock = readJson(io, "package-lock.json", "package-lock.json");
  if (!lock.ok) {
    return lock;
  }
  const rawPolicy = readJson(io, POLICY_FILE, "scripts/license-policy.json");
  if (!rawPolicy.ok) {
    return rawPolicy;
  }
  const policy = parsePolicy(rawPolicy.value);
  if (!policy.ok) {
    return { ok: false, error: `${policy.error} — Solução: corrija scripts/license-policy.json.` };
  }
  const packages = lockedPackages(lock.value);
  if (!packages.ok) {
    return {
      ok: false,
      error: `${packages.error} — Solução: gere o lockfile com npm 7 ou mais novo (npm install).`,
    };
  }
  return { ok: true, value: { packages: packages.value, policy: policy.value } };
}

function report(io: LicensesIo, packages: readonly LockedPackage[], check: LicenseCheck): void {
  const dev = packages.filter((item) => item.dev).length;
  io.log(
    `Licenças: ${String(packages.length)} pacotes verificados (${String(packages.length - dev)} de produção, ${String(dev)} só de desenvolvimento).`,
  );
  for (const exception of check.usedExceptions) {
    io.log(
      `Exceção usada: ${exception.package} (${String(exception.license)}, ${exception.scope}) — ${exception.reason}`,
    );
  }
  for (const exception of check.unusedExceptions) {
    io.log(
      `Aviso: exceção sem uso em scripts/license-policy.json: ${exception.package} — remova-a.`,
    );
  }
}

/** Runs the gate; returns the process exit code. */
export function main(_argv: readonly string[], io: LicensesIo): number {
  const inputs = loadInputs(io);
  if (!inputs.ok) {
    io.log(`Erro: ${inputs.error}`);
    return 1;
  }
  const { packages, policy } = inputs.value;
  const check = checkLicenses(packages, policy);
  report(io, packages, check);
  if (check.violations.length > 0) {
    io.log(
      `Erro: ${String(check.violations.length)} pacote(s) com licença fora da política — Solução: troque a dependência ou registre uma exceção justificada em scripts/license-policy.json (ADR 0019).`,
    );
    for (const violation of check.violations) {
      io.log(
        `  - ${violation.name}@${violation.version}: ${violation.license} (${SCOPE_LABEL[violation.scope]})`,
      );
    }
    return 1;
  }
  io.log("Licenças conforme a política (ADR 0019).");
  return 0;
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run licenses` */
if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2), { readText: readTextFile, log: console.log });
}
/* v8 ignore stop -- @preserve */
