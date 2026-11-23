import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { encodeUtf8 } from "./utf8.ts";

const REPLACEMENT = [0xef, 0xbf, 0xbd];

/** Any code point, lone surrogates included, so strings may be ill-formed UTF-16. */
const anyCodePoint = fc
  .oneof(
    fc.integer({ min: 0, max: 0x7f }),
    fc.integer({ min: 0x80, max: 0x7ff }),
    fc.integer({ min: 0x800, max: 0xffff }),
    fc.integer({ min: 0xd800, max: 0xdfff }),
    fc.integer({ min: 0x10000, max: 0x10ffff }),
  )
  .map((codePoint) => String.fromCodePoint(codePoint));

describe("UTF-8 encoding (simulation-model §15)", () => {
  it.each([
    [0x41, [0x41]],
    [0x7f, [0x7f]],
    [0x80, [0xc2, 0x80]],
    [0x7ff, [0xdf, 0xbf]],
    [0x800, [0xe0, 0xa0, 0x80]],
    [0xffff, [0xef, 0xbf, 0xbf]],
    [0x10000, [0xf0, 0x90, 0x80, 0x80]],
    [0x10ffff, [0xf4, 0x8f, 0xbf, 0xbf]],
  ])(
    "given the code point %i at a length boundary when encoding then the bytes are %j",
    (codePoint, bytes) => {
      expect([...encodeUtf8(String.fromCodePoint(codePoint))]).toStrictEqual(bytes);
    },
  );

  it.each([
    ["", []],
    ["ação", [0x61, 0xc3, 0xa7, 0xc3, 0xa3, 0x6f]],
    [`${String.fromCodePoint(0xffff)}A`, [0xef, 0xbf, 0xbf, 0x41]],
  ])("given the text %j when encoding then the bytes are %j", (text, bytes) => {
    expect([...encodeUtf8(text)]).toStrictEqual(bytes);
  });

  it.each([
    ["\ud800", REPLACEMENT],
    ["\udfff", REPLACEMENT],
    ["a\ud800b", [0x61, ...REPLACEMENT, 0x62]],
    ["\udc00\ud800", [...REPLACEMENT, ...REPLACEMENT]],
  ])("given the lone surrogates of %j when encoding then each becomes U+FFFD", (text, bytes) => {
    expect([...encodeUtf8(text)]).toStrictEqual(bytes);
  });

  it("given any UTF-16 string when encoding then the bytes equal the WHATWG TextEncoder output", () => {
    const encoder = new TextEncoder();
    fc.assert(
      fc.property(fc.string({ unit: anyCodePoint }), (text) => {
        expect([...encodeUtf8(text)]).toStrictEqual([...encoder.encode(text)]);
      }),
    );
  });
});
