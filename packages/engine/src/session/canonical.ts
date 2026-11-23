/**
 * Canonical serialization of the engine state (simulation-model §15): the same
 * state always gives the same text, whatever the order its keys were created in.
 * It is JSON without spaces, restricted to what the state may hold.
 */

function canonicalNumber(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`canonicalize: expected a safe integer, got ${value}`);
  }
  // String(-0) is "0", so negative zero and zero serialize alike.
  return String(value);
}

function isPlainObject(value: object): value is Readonly<Record<string, unknown>> {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalObject(value: object): string {
  if (Array.isArray(value)) {
    // Array.from visits holes as undefined (map would skip them), so sparse arrays throw.
    return `[${Array.from(value, (item: unknown) => canonicalize(item)).join(",")}]`;
  }
  if (!isPlainObject(value)) {
    throw new TypeError("canonicalize: only plain objects and arrays are allowed");
  }
  const members = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
  return `{${members.join(",")}}`;
}

/**
 * The canonical text of `value`: object keys sorted by UTF-16 code units (the
 * default `sort()`), arrays in their order, safe integers in decimal, strings
 * with JSON escapes, booleans and `null`, and no spaces.
 *
 * @throws RangeError for a number that is not a safe integer (`0.5`, `NaN`, `Infinity`).
 * @throws TypeError for `undefined`, functions, `BigInt`, symbols and objects that are
 * neither plain objects nor arrays (`Map`, `Set`, class instances, typed arrays).
 * @example
 * canonicalize({ b: 1, a: [true, null] }); // '{"a":[true,null],"b":1}'
 */
export function canonicalize(value: unknown): string {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return String(value);
    case "number":
      return canonicalNumber(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      return canonicalObject(value);
    default:
      throw new TypeError(`canonicalize: unsupported ${typeof value}`);
  }
}
