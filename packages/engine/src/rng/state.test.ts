import { describe, expect, it } from "vitest";

import { fnv1a32 } from "../domain/fnv.ts";
import { nextU32, sfc32FromWords, type StreamWords } from "./sfc32.ts";
import { createRngState, hash32, isSeed, SCENE_STREAMS, STREAMS, type RngState } from "./state.ts";

/** The first `count` raw u32 outputs of saved stream words. */
function rawOutputs(words: StreamWords, count: number): number[] {
  const state = sfc32FromWords(words);
  return Array.from({ length: count }, () => nextU32(state));
}

/** Names of the streams whose words are equal in both states. */
function sameStreams(a: RngState, b: RngState): string[] {
  return STREAMS.filter((name) => a.streams[name].join() === b.streams[name].join());
}

describe("seeded streams (simulation-model §15)", () => {
  it("given the stream names when listing them then there is one per purpose in the spec order", () => {
    expect(STREAMS).toStrictEqual([
      "generation",
      "setup",
      "turn",
      "choice",
      "signal",
      "perception",
      "resolution",
      "leave",
    ]);
    expect(SCENE_STREAMS).toStrictEqual(STREAMS.slice(1));
  });

  it("given a seed and a stream name when hashing then hash32 is FNV-1a 32 of seed:name", () => {
    expect([hash32(1, "turn"), hash32(42, "turn")]).toStrictEqual([0xceacd741, 0x68b57cf0]);
    expect(hash32(4294967295, "leave")).toBe(fnv1a32("4294967295:leave"));
  });

  it("given seed 1 and seed 42 when drawing the first 10 numbers then they match the recorded vectors", () => {
    // Raw u32 outputs of the `turn` stream fed by the scene seed, checked against an
    // independent Python implementation of §15 (FNV-1a 32 → splitmix32 → sfc32, 12 discards).
    const seed1 = rawOutputs(createRngState({ castSeed: 0, sceneSeed: 1 }).streams.turn, 10);
    const seed42 = rawOutputs(createRngState({ castSeed: 0, sceneSeed: 42 }).streams.turn, 10);

    expect(seed1).toStrictEqual([
      1996058204, 563728258, 374740190, 361967856, 2087040937, 2896922144, 3857097372, 2652793731,
      1956120980, 3427551891,
    ]);
    expect(seed42).toStrictEqual([
      2741767621, 1433941749, 1762308104, 1315824787, 1923118479, 4241941178, 1737456281,
      1584341142, 1000520911, 3477771265,
    ]);
  });

  it("given cast seed 1 and scene seed 42 when creating the rng state then every stream matches the reference", () => {
    expect(createRngState({ castSeed: 1, sceneSeed: 42 })).toStrictEqual({
      nextSeq: 0,
      streams: {
        generation: [835978867, 598873283, 3668351897, 3312764015],
        setup: [4198431974, 3108420255, 2961373074, 3164289048],
        turn: [3018750356, 829287473, 3053360133, 3188697088],
        choice: [3706685177, 2625838611, 2375047434, 293389530],
        signal: [408512464, 2024994086, 3157386190, 4002718620],
        perception: [2849887585, 3597001935, 4071599864, 668061180],
        resolution: [52938694, 68360367, 508620082, 1714068364],
        leave: [737897871, 2620585324, 3807054531, 1008653968],
      },
    });
  });

  it("given a new scene seed when creating the rng state then only the scene streams change", () => {
    const before = createRngState({ castSeed: 1, sceneSeed: 42 });
    const after = createRngState({ castSeed: 1, sceneSeed: 43 });

    expect(sameStreams(before, after)).toStrictEqual(["generation"]);
  });

  it("given a new cast seed when creating the rng state then only generation changes", () => {
    const before = createRngState({ castSeed: 1, sceneSeed: 42 });
    const after = createRngState({ castSeed: 2, sceneSeed: 42 });

    expect(sameStreams(before, after)).toStrictEqual([...SCENE_STREAMS]);
  });

  it.each([0, 1, 4294967295])("given %d when checking then it is a seed", (value) => {
    expect(isSeed(value)).toBe(true);
  });

  it.each([-1, 4294967296, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "given %d when checking then it is not a seed",
    (value) => {
      expect(isSeed(value)).toBe(false);
    },
  );

  it.each([
    [{ castSeed: -1, sceneSeed: 0 }, -1],
    [{ castSeed: 0, sceneSeed: 4294967296 }, 4294967296],
  ])("given the seeds %o when creating the rng state then a RangeError is thrown", (seeds, bad) => {
    expect(() => createRngState(seeds)).toThrow(
      new RangeError(`a seed must be an integer in 0..4294967295, got ${String(bad)}`),
    );
  });
});
