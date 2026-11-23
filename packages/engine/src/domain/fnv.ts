/**
 * FNV-1a hashes over the UTF-8 bytes of a text (simulation-model §15). The
 * 32-bit one seeds the draw streams; the 64-bit one, with `BigInt`, hashes the
 * canonical state. Neither is cryptographic: they only make replays checkable.
 */
import { encodeUtf8 } from "./utf8.ts";

const FNV32_OFFSET_BASIS = 0x811c9dc5;
const FNV32_PRIME = 0x01000193;
const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const HEX_DIGITS_64 = 16;

/**
 * FNV-1a, 32 bits, of the UTF-8 bytes of `text`.
 *
 * @returns an unsigned 32-bit integer.
 * @example
 * fnv1a32("foobar"); // 0xbf9cf968
 */
export function fnv1a32(text: string): number {
  let hash = FNV32_OFFSET_BASIS;
  for (const byte of encodeUtf8(text)) {
    hash = Math.imul(hash ^ byte, FNV32_PRIME);
  }
  return hash >>> 0;
}

/**
 * FNV-1a, 64 bits, of the UTF-8 bytes of `text`.
 *
 * @returns 16 lowercase hexadecimal digits.
 * @example
 * fnv1a64("foobar"); // "85944171f73967e8"
 */
export function fnv1a64(text: string): string {
  let hash = FNV64_OFFSET_BASIS;
  for (const byte of encodeUtf8(text)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * FNV64_PRIME);
  }
  return hash.toString(16).padStart(HEX_DIGITS_64, "0");
}
