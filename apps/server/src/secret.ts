/**
 * A wrapper for secret values, such as the OpenRouter key (ADR 0015,
 * development-rules §11). Logging, serializing or printing the configuration by
 * accident shows `[redacted]`, never the value.
 */

/** What a {@link Secret} shows instead of its value. */
export const REDACTED = "[redacted]";

/**
 * A secret value that does not leak by accident: `String()`, template literals,
 * `JSON.stringify` and Node's `inspect` (used by `console.log`) all show
 * {@link REDACTED}. The value lives in a private field, so it is not an own
 * property either. Only {@link Secret.reveal} gives it back.
 *
 * @example
 * ```ts
 * const key = new Secret("sk-or-…");
 * `${key}`;      // "[redacted]"
 * key.reveal();  // "sk-or-…", only where the value is sent to its destination
 * ```
 */
export class Secret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** The value itself. Call it only where the value is sent to its destination. */
  reveal(): string {
    return this.#value;
  }

  /** {@link REDACTED}: used by `String()`, template literals and concatenation. */
  toString(): string {
    return REDACTED;
  }

  /** {@link REDACTED}: used by `JSON.stringify` (and so by the pino logger). */
  toJSON(): string {
    return REDACTED;
  }

  /** {@link REDACTED}: used by Node's `util.inspect` and `console.log`. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return REDACTED;
  }
}
