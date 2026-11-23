/**
 * Reading presets by id inside the generator. The loaded presets hold every id
 * of each catalog (presets §1 rule 2), so a missing id is a programming error.
 */

/**
 * The preset with `id` in a loaded catalog.
 *
 * @throws RangeError if the catalog has no preset with that id.
 */
export function presetById<T extends { readonly id: string }>(
  catalog: readonly T[],
  id: string,
): T {
  const found = catalog.find((preset) => preset.id === id);
  if (found === undefined) {
    throw new RangeError(`no preset ${id} in the loaded catalog`);
  }
  return found;
}
