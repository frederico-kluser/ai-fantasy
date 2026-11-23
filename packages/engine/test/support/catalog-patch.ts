/**
 * Builds broken copies of the default catalogs for the loader tests (CORE-03:
 * "the tests pass broken catalogs on purpose"), and the loaded presets.
 */
import { DEFAULT_CATALOGS, type CatalogName, type Presets } from "../../src/presets/catalogs.ts";
import { loadPresets } from "../../src/presets/load.ts";

interface Entry {
  readonly id: string;
}

function entriesOf(catalog: CatalogName): readonly Entry[] {
  return DEFAULT_CATALOGS[catalog];
}

/** The default catalogs with `catalog` replaced by `entries` (any value, even a wrong one). */
export function withCatalog(catalog: string, entries: unknown): Record<string, unknown> {
  return { ...DEFAULT_CATALOGS, [catalog]: entries };
}

/** The default catalogs without `catalog`. */
export function withoutCatalog(catalog: CatalogName): Record<string, unknown> {
  return Object.fromEntries(Object.entries(DEFAULT_CATALOGS).filter(([name]) => name !== catalog));
}

/** The default catalogs with the fields of `patch` written over the preset `id`. */
export function patchPreset(catalog: CatalogName, id: string, patch: object) {
  const entries = entriesOf(catalog).map((entry) =>
    entry.id === id ? { ...entry, ...patch } : entry,
  );
  return withCatalog(catalog, entries);
}

/** The default catalogs without the preset `id`. */
export function withoutPreset(catalog: CatalogName, id: string) {
  return withCatalog(
    catalog,
    entriesOf(catalog).filter((entry) => entry.id !== id),
  );
}

/** The default catalogs with the preset `id` appended a second time. */
export function withRepeatedPreset(catalog: CatalogName, id: string) {
  const entries = entriesOf(catalog);
  return withCatalog(catalog, [...entries, ...entries.filter((entry) => entry.id === id)]);
}

/** The default presets, loaded; a failure here is a broken catalog in the code. */
export function loadedPresets(): Presets {
  const loaded = loadPresets();
  if (!loaded.ok) {
    throw new Error(`the default catalogs do not load: ${JSON.stringify(loaded.error)}`);
  }
  return loaded.value;
}
