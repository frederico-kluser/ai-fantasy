/**
 * Indexed reads for engine data: arrays and typed arrays indexed by cell, phase
 * or level. With `noUncheckedIndexedAccess`, a plain `values[i]` may be
 * `undefined`; the engine never reads past its data, so such a read is a
 * programming error (development-rules §4) and throws instead of spreading.
 */

/**
 * The element at `index` of an array or typed array.
 *
 * @throws RangeError if `index` is not an index of `values`.
 */
export function itemAt<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new RangeError(`index ${index} is outside 0..${values.length - 1}`);
  }
  return value;
}
