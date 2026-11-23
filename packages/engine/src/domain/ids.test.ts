import { describe, expect, it } from "vitest";

import { compareIds, toCharacterId } from "./ids.ts";
import { err, ok } from "./result.ts";

describe("character ids (development-rules §4)", () => {
  it.each([0, 1, 7, Number.MAX_SAFE_INTEGER])(
    "given %i when creating a CharacterId then it is ok",
    (value) => {
      expect(toCharacterId(value)).toStrictEqual(ok(value));
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "given %d when creating a CharacterId then the error is INVALID_ID",
    (value) => {
      expect(toCharacterId(value)).toStrictEqual(err("INVALID_ID"));
    },
  );

  it("given negative zero when creating a CharacterId then the id is zero", () => {
    // toStrictEqual compares numbers with Object.is, so -0 would not match 0.
    expect(toCharacterId(-0)).toStrictEqual(ok(0));
  });

  it("given ids out of order when sorting with compareIds then they are in increasing numeric order", () => {
    expect([10, 2, 0, 1].sort(compareIds)).toStrictEqual([0, 1, 2, 10]);
  });
});
