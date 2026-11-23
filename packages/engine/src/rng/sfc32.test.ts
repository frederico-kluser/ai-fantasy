import { describe, expect, it } from "vitest";

import { nextU32, seedSfc32, sfc32FromWords, sfc32Words, splitmix32 } from "./sfc32.ts";

describe("splitmix32 and sfc32 (simulation-model §15)", () => {
  it("given state 0 when running splitmix32 then the first outputs match the reference", () => {
    // Variant of §15 (increment 0x9e3779b9; 0x21f0aaad and 0x735a2d97; shifts 16, 15, 15),
    // checked against an independent Python implementation.
    const mixer = { state: 0 };

    expect(Array.from({ length: 4 }, () => splitmix32(mixer))).toStrictEqual([
      0x64625032, 0xd9c0799c, 0xaf362e10, 0x7fa88912,
    ]);
  });

  it("given a crafted state when stepping sfc32 then each output is a + b + counter", () => {
    const state = sfc32FromWords([0xffffffff, 0, 0, 0]);

    expect([nextU32(state), nextU32(state)]).toStrictEqual([0xffffffff, 1]);
  });

  it("given a seed when seeding sfc32 then the words are splitmix32 outputs after 12 discarded rounds", () => {
    // hash32(1, "turn") = 0xceacd741 seeds the `turn` stream of scene seed 1.
    expect(sfc32Words(seedSfc32(0xceacd741))).toStrictEqual([
      757950549, 1596028787, 2788515645, 3937046164,
    ]);
  });

  it("given words with the top bit set when stepping and saving then they come back unsigned", () => {
    const state = sfc32FromWords([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);

    expect(nextU32(state)).toBe(4294967293);
    expect(sfc32Words(state)).toStrictEqual([4286578688, 4294967287, 4294967292, 0]);
  });
});
