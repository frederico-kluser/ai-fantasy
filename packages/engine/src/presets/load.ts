/**
 * Loading the preset catalogs (presets §1): the schema of every preset, then
 * the ids (no repeats, no gaps), then the rules across catalogs. Problems are
 * values: every one comes back as a {@link PresetError}.
 */
import type { z } from "zod";

import { err, ok, type Result } from "../domain/result.ts";
import {
  CATALOG_IDS,
  CATALOG_NAMES,
  catalogsSchema,
  DEFAULT_CATALOGS,
  type CatalogName,
  type Presets,
} from "./catalogs.ts";
import { crossCatalogProblems } from "./cross-checks.ts";
import type { PresetError } from "./errors.ts";

function isRecord(value: unknown): value is Readonly<Record<PropertyKey, unknown>> {
  return typeof value === "object" && value !== null;
}

/** The value at `path` inside `input`, or `undefined` once the path leaves the data. */
function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), input);
}

function isCatalogName(value: unknown): value is CatalogName {
  return CATALOG_NAMES.some((name) => name === value);
}

/** The error of a problem at `path` (catalog, index, then the field inside the preset). */
function errorAt(path: readonly PropertyKey[], message: string, input: unknown): PresetError {
  const [catalog, index, ...field] = path;
  if (isCatalogName(catalog) && typeof index === "number") {
    const id = valueAt(input, [catalog, index, "id"]);
    const presetId = typeof id === "string" ? id : null;
    const fieldPath = field.map(String).join(".");
    return { code: "INVALID_PRESET", catalog, index, presetId, path: fieldPath, message };
  }
  const known = isCatalogName(catalog);
  return {
    code: "INVALID_CATALOGS",
    catalog: known ? catalog : null,
    index: null,
    presetId: null,
    path: known ? "" : String(catalog ?? ""),
    message,
  };
}

/** One error per schema issue; an unknown field or catalog gives one error per key. */
function issueErrors(issue: z.core.$ZodIssue, input: unknown): PresetError[] {
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) =>
      errorAt([...issue.path, key], `Unrecognized key: "${key}"`, input),
    );
  }
  return [errorAt(issue.path, issue.message, input)];
}

function repeatedIds(catalog: CatalogName, ids: readonly string[]): PresetError[] {
  return ids.flatMap((presetId, index) => {
    const first = ids.indexOf(presetId);
    const message = `the id ${presetId} is already used at index ${first}`;
    const error: PresetError = {
      code: "DUPLICATE_ID",
      catalog,
      index,
      presetId,
      path: "id",
      message,
    };
    return first < index ? [error] : [];
  });
}

function missingIds(catalog: CatalogName, ids: readonly string[]): PresetError[] {
  return CATALOG_IDS[catalog]
    .filter((id) => !ids.includes(id))
    .map((presetId) => {
      const message = `no preset has the id ${presetId}`;
      return { code: "MISSING_ID", catalog, index: null, presetId, path: "", message };
    });
}

/** presets §1 rule 2: each catalog holds each of its ids exactly once. */
function idErrors(presets: Presets): PresetError[] {
  return CATALOG_NAMES.flatMap((catalog) => {
    const entries: readonly { readonly id: string }[] = presets[catalog];
    const ids = entries.map((entry) => entry.id);
    return [...repeatedIds(catalog, ids), ...missingIds(catalog, ids)];
  });
}

/**
 * Validates `catalogs` and returns the presets, or every problem found. The
 * checks run in three stages, each only if the one before found nothing: the
 * schema of every preset (fields and references to other catalogs), the ids of
 * every catalog, and the rules across catalogs.
 *
 * @param catalogs the catalogs to load; by default, the engine's own
 * ({@link DEFAULT_CATALOGS}). Any value is accepted and checked.
 * @returns the read-only presets, or the list of {@link PresetError}s, each
 * naming the catalog, the preset and the field.
 * @example
 * const presets = loadPresets();
 * if (!presets.ok) throw new Error(JSON.stringify(presets.error)); // a broken catalog
 * presets.value.places.find((place) => place.id === "home");
 */
export function loadPresets(
  catalogs: unknown = DEFAULT_CATALOGS,
): Result<Presets, readonly PresetError[]> {
  const parsed = catalogsSchema.safeParse(catalogs);
  if (!parsed.success) {
    return err(parsed.error.issues.flatMap((issue) => issueErrors(issue, catalogs)));
  }
  const idProblems = idErrors(parsed.data);
  const problems = idProblems.length > 0 ? idProblems : crossCatalogProblems(parsed.data);
  return problems.length > 0 ? err(problems) : ok(parsed.data);
}
