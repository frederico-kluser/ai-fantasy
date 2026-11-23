/**
 * The generator of every draw stream (simulation-model §15): `sfc32`, seeded by
 * `splitmix32`. Only integer operations (`Math.imul`, `|`, `^`, `<<`, `>>>`), so
 * every machine gives the same numbers.
 */

/** The four sfc32 words `a, b, c, d`, as unsigned 32-bit integers: a saved stream. */
export type StreamWords = readonly [a: number, b: number, c: number, d: number];

/**
 * Working sfc32 state, mutated by {@link nextU32}. Words may be held as signed or
 * unsigned 32-bit integers; `d` is the counter, so it counts the outputs drawn.
 */
export interface Sfc32 {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Working splitmix32 state, mutated by {@link splitmix32}. */
export interface SplitMix32 {
  state: number;
}

/** sfc32 outputs thrown away after seeding (simulation-model §15). */
const DISCARDED_OUTPUTS = 12;

/**
 * Next output of splitmix32, the variant of simulation-model §15: add
 * `0x9e3779b9` to the state, then mix with `z ^= z >>> 16; z *= 0x21f0aaad;
 * z ^= z >>> 15; z *= 0x735a2d97; z ^= z >>> 15` (all modulo 2^32).
 *
 * @returns an unsigned 32-bit integer.
 */
export function splitmix32(mixer: SplitMix32): number {
  mixer.state = (mixer.state + 0x9e3779b9) | 0;
  let z = mixer.state;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

/**
 * Next output of sfc32 (Chris Doty-Humphrey's small fast chaotic generator, 32
 * bits): `t = a + b + d; d += 1; a = b ^ (b >>> 9); b = c + (c << 3);
 * c = rotl(c, 21) + t` (all modulo 2^32).
 *
 * @returns an unsigned 32-bit integer.
 */
export function nextU32(state: Sfc32): number {
  const t = (((state.a + state.b) | 0) + state.d) | 0;
  state.d = (state.d + 1) | 0;
  state.a = state.b ^ (state.b >>> 9);
  state.b = (state.c + (state.c << 3)) | 0;
  state.c = (((state.c << 21) | (state.c >>> 11)) + t) | 0;
  return t >>> 0;
}

/**
 * A fresh sfc32 state: its words `a, b, c, d` are four outputs in a row of
 * splitmix32 started at `seed32`, and the first 12 sfc32 outputs are discarded.
 */
export function seedSfc32(seed32: number): Sfc32 {
  const mixer: SplitMix32 = { state: seed32 };
  const state: Sfc32 = {
    a: splitmix32(mixer),
    b: splitmix32(mixer),
    c: splitmix32(mixer),
    d: splitmix32(mixer),
  };
  for (let discarded = 0; discarded < DISCARDED_OUTPUTS; discarded += 1) {
    nextU32(state);
  }
  return state;
}

/** A working state that continues from saved words. */
export function sfc32FromWords([a, b, c, d]: StreamWords): Sfc32 {
  return { a, b, c, d };
}

/** The words of a working state, saved as unsigned 32-bit integers. */
export function sfc32Words(state: Sfc32): StreamWords {
  return [state.a >>> 0, state.b >>> 0, state.c >>> 0, state.d >>> 0];
}
