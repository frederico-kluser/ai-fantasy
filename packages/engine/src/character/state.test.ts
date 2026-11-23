import { describe, expect, it } from "vitest";

import { toBipolarBp } from "../domain/bp.ts";
import type { ThingId } from "../domain/ids.ts";
import { idOf } from "../../test/support/space.ts";
import { tagValences, type Association } from "./state.ts";

describe("tagValences (simulation-model §5.7)", () => {
  it("given associations with a present tag, an absent tag, a thing and a person when listing then only the present tag counts", () => {
    const associations: Association[] = [
      { subject: { kind: "TAG", tag: "water" }, valence: toBipolarBp(-7000) },
      { subject: { kind: "TAG", tag: "forest" }, valence: toBipolarBp(-6000) },
      { subject: { kind: "THING", thing: 1 as ThingId }, valence: toBipolarBp(4000) },
      { subject: { kind: "PERSON", person: idOf(3) }, valence: toBipolarBp(5000) },
    ];

    expect(tagValences(associations, ["forest", "dark"])).toStrictEqual([-6000]);
  });
});
