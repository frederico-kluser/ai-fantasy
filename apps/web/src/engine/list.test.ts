import { describe, expect, it } from "vitest";

import { itemAt } from "./list.ts";

describe("itemAt", () => {
  it.each([
    [0, "a"],
    [2, "c"],
  ])("given index %i when reading then the item comes back", (index, item) => {
    expect(itemAt(["a", "b", "c"], index)).toBe(item);
  });

  it.each([-1, 3])("given index %i outside the list when reading then it throws", (index) => {
    expect(() => itemAt(["a", "b", "c"], index)).toThrow(`no item at ${String(index)} of 3`);
  });

  it("given a null item inside the list when reading then it comes back", () => {
    expect(itemAt([null], 0)).toBeNull();
  });
});
