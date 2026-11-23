import { describe, expect, it } from "vitest";

import {
  chanceOutcomes,
  pickWeighted,
  rawOutcomes,
  requireChance,
  totalWeight,
  weightedOutcomes,
} from "./outcomes.ts";

describe("raw draw outcomes (simulation-model §15)", () => {
  it("given a natural value when resolving then the outcome is the value", () => {
    expect(rawOutcomes.natural(7, 10)).toBe(7);
  });

  it.each([
    [1, 0],
    [2, 0],
    [3, 1],
    [10, 4],
    [2147483648, 1073741823],
  ])(
    "given bound %i in MOST_LIKELY mode when resolving then the outcome is %i",
    (bound, outcome) => {
      expect(rawOutcomes.mostLikely(bound)).toBe(outcome);
    },
  );

  it.each([
    [0, true],
    [9, true],
    [10, false],
    [-1, false],
    [1.5, false],
  ])(
    "given the forced outcome %d below 10 when checking then possible is %s",
    (outcome, possible) => {
      expect(rawOutcomes.isPossible(outcome, 10)).toBe(possible);
    },
  );
});

describe("chance outcomes (simulation-model §15)", () => {
  it.each([
    [0, 0, 0],
    [4999, 5000, 1],
    [5000, 5000, 0],
    [5001, 5000, 0],
    [9999, 10000, 1],
  ])("given u %i and p %i when resolving naturally then the outcome is %i", (u, p, outcome) => {
    expect(chanceOutcomes.natural(u, p)).toBe(outcome);
  });

  it.each([
    [0, 0],
    [4999, 0],
    [5000, 1],
    [10000, 1],
  ])("given p %i in MOST_LIKELY mode when resolving then the outcome is %i", (p, outcome) => {
    expect(chanceOutcomes.mostLikely(p)).toBe(outcome);
  });

  it.each([
    [1, 0, false],
    [1, 1, true],
    [1, 10000, true],
    [0, 10000, false],
    [0, 9999, true],
    [0, 0, true],
    [2, 5000, false],
    [-1, 5000, false],
  ])(
    "given the forced outcome %i with p %i when checking then possible is %s",
    (outcome, p, possible) => {
      expect(chanceOutcomes.isPossible(outcome, p)).toBe(possible);
    },
  );

  it.each([0, 5000, 10000])("given chance %i when validating then it is accepted", (p) => {
    expect(requireChance(p)).toBe(p);
  });

  it.each([-1, 10001, 1.5, Number.NaN])(
    "given chance %d when validating then a RangeError is thrown",
    (p) => {
      expect(() => requireChance(p)).toThrow(
        new RangeError(`a chance must be an integer in 0..10000 bp, got ${String(p)}`),
      );
    },
  );
});

describe("weighted outcomes (simulation-model §15)", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 2],
  ])("given u %i over the weights 1, 2 and 3 when picking then the index is %i", (u, index) => {
    expect(pickWeighted([1, 2, 3], u)).toBe(index);
  });

  it.each([
    [0, 1],
    [4, 1],
    [5, 3],
    [9, 3],
  ])("given u %i over the weights 0, 5, 0 and 5 when picking then the index is %i", (u, index) => {
    expect(pickWeighted([0, 5, 0, 5], u)).toBe(index);
  });

  it("given a natural value when resolving then the outcome is the picked index", () => {
    expect(weightedOutcomes.natural(3, [1, 2, 3])).toBe(2);
  });

  it.each([
    [[1, 5, 2], 1],
    [[3, 7, 7], 1],
    [[0, 0, 4], 2],
    [[0, 1], 1],
    [[6], 0],
  ])(
    "given the weights %j in MOST_LIKELY mode when resolving then the outcome is %i",
    (weights, outcome) => {
      expect(weightedOutcomes.mostLikely(weights)).toBe(outcome);
    },
  );

  it("given 500 000 options in MOST_LIKELY mode when resolving then the heaviest wins without exhausting the stack", () => {
    const weights = Array.from({ length: 500000 }, (_, index) => index % 7);

    expect(weightedOutcomes.mostLikely(weights)).toBe(6);
  });

  it.each([
    [0, false],
    [1, true],
    [2, true],
    [3, false],
    [-1, false],
    [1.5, false],
  ])(
    "given the forced index %d over the weights 0, 3 and 1 when checking then possible is %s",
    (index, possible) => {
      expect(weightedOutcomes.isPossible(index, [0, 3, 1])).toBe(possible);
    },
  );

  it.each([
    [[1], 1],
    [[0, 2, 0], 2],
    [[2147483647, 1], 2147483648],
  ])("given the weights %j when totaling then the total is %i", (weights, total) => {
    expect(totalWeight(weights)).toBe(total);
  });

  it.each([[[-1, 2]], [[1.5]], [[Number.NaN]]])(
    "given the weights %j when totaling then a RangeError is thrown",
    (weights) => {
      expect(() => totalWeight(weights)).toThrow(/^weights must be integers ≥ 0, got /);
    },
  );

  it.each([
    [[], 0],
    [[0, 0], 0],
    [[2147483648, 1], 2147483649],
  ])("given the weights %j when totaling then a RangeError is thrown", (weights, total) => {
    expect(() => totalWeight(weights)).toThrow(
      new RangeError(`the total weight must be in 1..2147483648, got ${String(total)}`),
    );
  });
});
