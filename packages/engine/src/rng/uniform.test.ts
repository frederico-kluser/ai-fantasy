import { describe, expect, it } from "vitest";

import { seedSfc32, sfc32FromWords } from "./sfc32.ts";
import { hash32 } from "./state.ts";
import { MAX_DRAW_BOUND, uniformBelow } from "./uniform.ts";

describe("unbiased draws (simulation-model §15)", () => {
  it("given a u32 at the rejection limit when drawing below 3 then it is rejected and the next one is used", () => {
    // 2^32 mod 3 = 1, so the limit is 2^32 − 1: this state yields 4294967295 (rejected), then 1.
    expect(uniformBelow(sfc32FromWords([0xffffffff, 0, 0, 0]), 3)).toBe(1);
  });

  it("given a u32 just below the rejection limit when drawing below 3 then it is used", () => {
    // This state yields 4294967294 first: accepted, and 4294967294 mod 3 = 2.
    expect(uniformBelow(sfc32FromWords([0xfffffffe, 0, 0, 0]), 3)).toBe(2);
  });

  it("given a bound that does not divide 2^32 when drawing many times then no value reaches the bound and rejection is used", () => {
    // bound = 3 × 2^29: 2^32 mod bound = 2^30, so a quarter of the u32 values is rejected.
    // The sfc32 counter word `d` counts every u32 consumed.
    const bound = 1610612736;
    const state = seedSfc32(hash32(7, "turn"));
    const counterBefore = state.d;

    const values = Array.from({ length: 200 }, () => uniformBelow(state, bound));

    expect(Math.max(...values)).toBeLessThan(bound);
    expect((state.d - counterBefore) >>> 0).toBe(277);
  });

  it("given bound 1 when drawing then the value is 0", () => {
    expect(uniformBelow(seedSfc32(1), 1)).toBe(0);
  });

  it("given the largest bound when drawing then the draw works", () => {
    expect(MAX_DRAW_BOUND).toBe(2147483648);
    expect(uniformBelow(sfc32FromWords([0xffffffff, 0, 0, 0]), MAX_DRAW_BOUND)).toBe(2147483647);
  });

  it.each([0, -1, 1.5, Number.NaN, 2147483649])(
    "given bound %d when drawing then a RangeError is thrown",
    (bound) => {
      expect(() => uniformBelow(seedSfc32(1), bound)).toThrow(
        new RangeError(`a draw bound must be an integer in 1..2147483648, got ${String(bound)}`),
      );
    },
  );
});
