import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { canonicalize } from "./canonical.ts";

const PLAIN_OBJECTS_ONLY = new TypeError("canonicalize: only plain objects and arrays are allowed");

/** JSON-like values whose numbers are safe integers: what an engine state is made of. */
const { value: stateLikeValue } = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small" },
    fc.constant(null),
    fc.boolean(),
    fc.maxSafeInteger(),
    fc.string(),
    fc.array(tie("value"), { maxLength: 4 }),
    fc.dictionary(fc.string(), tie("value"), { maxKeys: 4 }),
  ),
}));

describe("canonical serialization (simulation-model §15)", () => {
  it.each([
    [null, "null"],
    [true, "true"],
    [false, "false"],
    [0, "0"],
    [-0, "0"],
    [-42, "-42"],
    [Number.MAX_SAFE_INTEGER, "9007199254740991"],
    ["", '""'],
    ['say "hi"\\\n', '"say \\"hi\\"\\\\\\n"'],
    ["ação", '"ação"'],
    ["\ud800", '"\\ud800"'],
    [[], "[]"],
    [{}, "{}"],
    [[1, "x", null, [true]], '[1,"x",null,[true]]'],
    [{ b: 1, a: { d: [2], c: false } }, '{"a":{"c":false,"d":[2]},"b":1}'],
  ])("given %j when canonicalizing then the text is %s", (value, text) => {
    expect(canonicalize(value)).toBe(text);
  });

  it("given keys with mixed case, digits and non-ASCII when canonicalizing then keys follow UTF-16 code unit order", () => {
    // U+1F600 is the surrogate pair D83D DE00, so it sorts before U+FFFF in UTF-16 order.
    const lastBmp = String.fromCodePoint(0xffff);
    const value = { b: 1, a: 2, B: 3, é: 4, "😀": 5, [lastBmp]: 6, _: 7, "10": 8, "9": 9 };

    expect(canonicalize(value)).toBe(
      `{"10":8,"9":9,"B":3,"_":7,"a":2,"b":1,"é":4,"😀":5,"${lastBmp}":6}`,
    );
  });

  it("given an object with a null prototype when canonicalizing then it is accepted", () => {
    expect(canonicalize({ __proto__: null, b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2 ** 53])(
    "given the number %d when canonicalizing then a RangeError is thrown",
    (value) => {
      expect(() => canonicalize(value)).toThrow(
        new RangeError(`canonicalize: expected a safe integer, got ${String(value)}`),
      );
    },
  );

  it.each([
    ["undefined", undefined],
    ["function", () => 1],
    ["bigint", 1n],
    ["symbol", Symbol("draw")],
  ])("given a %s when canonicalizing then a TypeError is thrown", (type, value) => {
    expect(() => canonicalize(value)).toThrow(new TypeError(`canonicalize: unsupported ${type}`));
  });

  it.each([
    ["a Map", new Map([["a", 1]])],
    ["a Set", new Set([1])],
    [
      "a class instance",
      new (class Point {
        readonly x = 1;
      })(),
    ],
    ["a typed array", new Uint8Array(2)],
  ])("given %s when canonicalizing then a TypeError is thrown", (_, value) => {
    expect(() => canonicalize(value)).toThrow(PLAIN_OBJECTS_ONLY);
  });

  it.each([[{ a: undefined }], [[1, undefined]], [{ a: [1, { b: 0.5 }] }], [{ a: new Map() }]])(
    "given %o with an unsupported value inside when canonicalizing then it throws",
    (value) => {
      expect(() => canonicalize(value)).toThrow(/^canonicalize: /);
    },
  );

  it("given a sparse array when canonicalizing then its holes are rejected as undefined", () => {
    expect(() => canonicalize(new Array(2))).toThrow(
      new TypeError("canonicalize: unsupported undefined"),
    );
  });

  it("given JSON-like values with integers when canonicalizing then JSON.parse gives the value back", () => {
    fc.assert(
      fc.property(stateLikeValue, (value) => {
        const parsed: unknown = JSON.parse(canonicalize(value));

        expect(parsed).toEqual(value);
      }),
    );
  });

  it("given any record when reversing its key order then the text is the same", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.maxSafeInteger()), (record) => {
        const reversed = Object.fromEntries(Object.entries(record).reverse());

        expect(canonicalize(reversed)).toBe(canonicalize(record));
      }),
    );
  });
});
