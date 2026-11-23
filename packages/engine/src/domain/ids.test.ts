import { describe, expect, it } from "vitest";

import { compareIds, toCharacterId, toFactId, toThingId } from "./ids.ts";
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

describe("fact and thing ids (simulation-model §12, dialogue-acts §4)", () => {
  it.each([
    ["FactId", toFactId],
    ["ThingId", toThingId],
  ] as const)("given 0 and 41 when creating a %s then both are ok", (_name, create) => {
    expect([create(0), create(41)]).toStrictEqual([ok(0), ok(41)]);
  });

  it.each([
    ["FactId", toFactId],
    ["ThingId", toThingId],
  ] as const)(
    "given -1 or 0.5 when creating a %s then the error is INVALID_ID",
    (_name, create) => {
      expect([create(-1), create(0.5)]).toStrictEqual([err("INVALID_ID"), err("INVALID_ID")]);
    },
  );

  it("given negative zero when creating a FactId then the id is zero", () => {
    expect(toFactId(-0)).toStrictEqual(ok(0));
  });
});
