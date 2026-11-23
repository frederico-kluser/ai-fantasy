/**
 * Expected errors are values, not exceptions (development-rules §4): a function
 * that can fail for a reason the caller must handle returns a {@link Result}.
 * `throw` is only for programming errors (a broken invariant).
 */

/** A successful {@link Result}, carrying the value. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** A failed {@link Result}, carrying the error (usually a SCREAMING_SNAKE_CASE code). */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * The outcome of an operation that can fail: narrow it with `result.ok`.
 *
 * @example
 * const id = toCharacterId(input);
 * if (!id.ok) return id; // propagate the error
 * use(id.value);
 */
export type Result<T, E> = Ok<T> | Err<E>;

/** Wraps a successful value. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Wraps an expected error. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
