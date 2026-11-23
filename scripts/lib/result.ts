/** A value, or the reason there is none: expected failures are values, not exceptions. */
export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };
