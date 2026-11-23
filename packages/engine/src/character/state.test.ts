import { describe, expect, it } from "vitest";

import { toBipolarBp } from "../domain/bp.ts";
import type { ThingId } from "../domain/ids.ts";
import { idOf } from "../../test/support/space.ts";
import { aCharacter, someEmotions, someShifts, someTraits } from "../../test/support/character.ts";
import { refreshBaselines, tagValences, type Association } from "./state.ts";

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

describe("refreshBaselines (simulation-model §5.2 and §13 item 5)", () => {
  it("given a crystallized temper and a history shift of anger +2800 when refreshing then the baselines come from the traits plus the shifts, limited to 3000", () => {
    const character = aCharacter(1, 0, {
      traits: someTraits({ temper: 2000, humor: 4000 }),
      baselineShifts: someShifts({ anger: 2800, guilt: 500 }),
    });

    expect(refreshBaselines(character).baselines).toStrictEqual(
      someEmotions({ joy: 2000, sadness: 100, fear: 500, anger: 3000, guilt: 500 }),
    );
  });

  it("given a shift kept in the state when the temper falls later then the anger baseline recovers below the limit", () => {
    const character = aCharacter(1, 0, {
      traits: someTraits({ temper: -5000 }),
      baselineShifts: someShifts({ anger: 2800 }),
    });

    expect(refreshBaselines(character).baselines.anger).toBe(2800);
  });
});
