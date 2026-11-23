import { describe, expect, it } from "vitest";

import { createRngState } from "../rng/state.ts";
import { hashState } from "./hash.ts";

describe("state hash (simulation-model §15)", () => {
  it("given two objects with keys in different orders when hashing then the hashes are equal", () => {
    const first = { a: 1, b: [true, null], c: { y: 2, x: 1 } };
    const second = { c: { x: 1, y: 2 }, b: [true, null], a: 1 };

    expect(hashState(second)).toBe(hashState(first));
  });

  it("given a value when hashing then the hash is FNV-1a 64 of its canonical text", () => {
    // fnv1a64('{"a":[true,null,"x"],"b":-1}') from the independent Python reference.
    expect(hashState({ b: -1, a: [true, null, "x"] })).toBe("6b9a08c32f4ecf51");
  });

  it("given values that differ in one number when hashing then the hashes differ", () => {
    expect(hashState({ a: 1 })).not.toBe(hashState({ a: 2 }));
  });

  it("given an rng state when hashing then the hash has 16 lowercase hexadecimal digits", () => {
    expect(hashState(createRngState({ castSeed: 1, sceneSeed: 42 }))).toMatch(/^[0-9a-f]{16}$/);
  });

  it("given a value that is not canonical when hashing then it throws", () => {
    expect(() => hashState({ a: 0.5 })).toThrow(
      new RangeError("canonicalize: expected a safe integer, got 0.5"),
    );
  });
});
