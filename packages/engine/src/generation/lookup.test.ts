import { describe, expect, it } from "vitest";

import { presetById } from "./lookup.ts";

const CATALOG = [
  { id: "a", value: 1 },
  { id: "b", value: 2 },
];

describe("presetById", () => {
  it("given a known id when reading the catalog then the preset comes back", () => {
    expect(presetById(CATALOG, "b")).toStrictEqual({ id: "b", value: 2 });
  });

  it("given a missing id when reading the catalog then it is a programming error", () => {
    expect(() => presetById(CATALOG, "c")).toThrow(
      new RangeError("no preset c in the loaded catalog"),
    );
  });
});
