/**
 * UTF-8 encoding written by hand, because the engine's `lib` (ES2024, no DOM) has
 * no `TextEncoder`. The bytes are exactly the WHATWG encoder's: a lone surrogate
 * becomes U+FFFD (simulation-model §15).
 */

/** First code point that needs 2, 3 and 4 UTF-8 bytes. */
const TWO_BYTE_MIN = 0x80;
const THREE_BYTE_MIN = 0x800;
const FOUR_BYTE_MIN = 0x10000;

/** A UTF-16 code unit never needs more than 3 bytes (a surrogate pair needs 4 for 2 units). */
const MAX_BYTES_PER_UNIT = 3;

/** Writes the UTF-8 bytes of `codePoint` at `offset` and returns the offset after them. */
function writeCodePoint(bytes: Uint8Array, offset: number, codePoint: number): number {
  if (codePoint < TWO_BYTE_MIN) {
    bytes[offset] = codePoint;
    return offset + 1;
  }
  if (codePoint < THREE_BYTE_MIN) {
    bytes[offset] = 0xc0 | (codePoint >>> 6);
    bytes[offset + 1] = 0x80 | (codePoint & 0x3f);
    return offset + 2;
  }
  if (codePoint < FOUR_BYTE_MIN) {
    bytes[offset] = 0xe0 | (codePoint >>> 12);
    bytes[offset + 1] = 0x80 | ((codePoint >>> 6) & 0x3f);
    bytes[offset + 2] = 0x80 | (codePoint & 0x3f);
    return offset + 3;
  }
  bytes[offset] = 0xf0 | (codePoint >>> 18);
  bytes[offset + 1] = 0x80 | ((codePoint >>> 12) & 0x3f);
  bytes[offset + 2] = 0x80 | ((codePoint >>> 6) & 0x3f);
  bytes[offset + 3] = 0x80 | (codePoint & 0x3f);
  return offset + 4;
}

/**
 * The UTF-8 bytes of `text`, equal to `new TextEncoder().encode(text)`.
 *
 * @example
 * encodeUtf8("ação"); // Uint8Array [0x61, 0xc3, 0xa7, 0xc3, 0xa3, 0x6f]
 */
export function encodeUtf8(text: string): Uint8Array {
  const wellFormed = text.toWellFormed();
  const bytes = new Uint8Array(wellFormed.length * MAX_BYTES_PER_UNIT);
  let length = 0;
  let index = 0;
  while (index < wellFormed.length) {
    // An index below the length always has a code point.
    const codePoint = wellFormed.codePointAt(index) as number;
    length = writeCodePoint(bytes, length, codePoint);
    // Code points from U+10000 on take two UTF-16 code units (a surrogate pair).
    index += codePoint < FOUR_BYTE_MIN ? 1 : 2;
  }
  return bytes.subarray(0, length);
}
