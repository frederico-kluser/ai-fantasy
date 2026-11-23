/**
 * Errors of the preset loader (presets §1): each one names the catalog, the
 * preset and the field, so a broken catalog is fixed without guessing.
 */

/** Names of the preset catalogs, in the order they are loaded and checked. */
export const CATALOG_NAMES = [
  "bodyNeeds",
  "emotions",
  "drives",
  "bondAxes",
  "bondLabels",
  "traits",
  "aptitudes",
  "signals",
  "places",
  "weathers",
  "associationTags",
  "characterArchetypes",
  "bondArchetypes",
  "historyEvents",
  "dayStates",
  "acts",
  "tones",
  "topicTypes",
  "requestObjects",
] as const;

/** Name of a preset catalog. */
export type CatalogName = (typeof CATALOG_NAMES)[number];

/**
 * Why the presets did not load:
 * - `INVALID_CATALOGS`: the set of catalogs is not an object with exactly the
 *   catalog names, or a catalog is not a list;
 * - `INVALID_PRESET`: a preset breaks its schema (a field, a reference to
 *   another catalog, or a rule inside the preset);
 * - `DUPLICATE_ID` / `MISSING_ID`: an id appears twice, or a known id has no preset;
 * - `INCONSISTENT`: presets of different catalogs disagree (reciprocal labels,
 *   directed drives, the scale of a need).
 */
export type PresetErrorCode =
  "INVALID_CATALOGS" | "INVALID_PRESET" | "DUPLICATE_ID" | "MISSING_ID" | "INCONSISTENT";

/** One problem found while loading the presets. */
export interface PresetError {
  readonly code: PresetErrorCode;
  /** The catalog, or `null` when the problem is the set of catalogs itself. */
  readonly catalog: CatalogName | null;
  /** Position of the preset in its catalog, when the problem is in one preset. */
  readonly index: number | null;
  /** Id of the preset (as given, even if invalid), when it has a text id. */
  readonly presetId: string | null;
  /** Dotted path of the field inside the preset (`"grid.exits.0"`); `""` for the whole of it. */
  readonly path: string;
  /** What is wrong, in English. */
  readonly message: string;
}

/** Where a problem across catalogs was found: catalog, position, id and field. */
export interface PresetPlace {
  readonly catalog: CatalogName;
  readonly index: number;
  readonly presetId: string;
  readonly path: string;
}

/** An `INCONSISTENT` error at `place`. */
export function inconsistent(place: PresetPlace, message: string): PresetError {
  return { code: "INCONSISTENT", ...place, message };
}
