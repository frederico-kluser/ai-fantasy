/** Reading lists that must hold an item (the engine's lists are parallel, by character id). */

/**
 * The item at `index`.
 *
 * @throws RangeError when the list has no item there (a broken invariant).
 */
export function itemAt<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new RangeError(`no item at ${String(index)} of ${String(list.length)}`);
  }
  // The index was just checked against the length.
  return list[index] as T;
}
