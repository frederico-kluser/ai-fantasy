import { describe, expect, it } from "vitest";

import { itemAt } from "./lookup.ts";

describe("itemAt (development-rules §4)", () => {
  it("given an index inside an array when reading then itemAt returns the element", () => {
    expect(itemAt(["a", "b", "c"], 2)).toBe("c");
  });

  it("given an index inside a typed array when reading then itemAt returns the element", () => {
    expect(itemAt(Int32Array.of(7, -3), 1)).toBe(-3);
  });

  it("given a zero element when reading then itemAt returns it", () => {
    expect(itemAt(Uint8Array.of(0), 0)).toBe(0);
  });

  it.each([-1, 3, 1.5])(
    "given index %d outside the array when reading then itemAt throws a RangeError",
    (index) => {
      expect(() => itemAt([1, 2, 3], index)).toThrow(
        new RangeError(`index ${index} is outside 0..2`),
      );
    },
  );
});
