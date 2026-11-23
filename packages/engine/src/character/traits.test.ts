import { describe, expect, it } from "vitest";

import { someTraits } from "../../test/support/character.ts";
import { effectiveTrait } from "./traits.ts";

describe("effectiveTrait (simulation-model §13 item 3)", () => {
  it("given no tendency when reading a trait then it is the trait itself", () => {
    expect(effectiveTrait(someTraits({ temper: 4000 }), someTraits(), "temper")).toBe(4000);
  });

  it("given a tendency of -5000 when reading a trait of -2000 then it is -3500", () => {
    expect(
      effectiveTrait(someTraits({ honesty: -2000 }), someTraits({ honesty: -5000 }), "honesty"),
    ).toBe(-3500);
  });

  it("given a trait of 9000 and a tendency of 10000 when reading it then it is clamped to 10000", () => {
    expect(
      effectiveTrait(someTraits({ courage: 9000 }), someTraits({ courage: 10000 }), "courage"),
    ).toBe(10000);
  });
});
