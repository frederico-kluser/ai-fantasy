import { describe, expect, it } from "vitest";

import { toBp } from "../domain/bp.ts";
import { aBond, aCharacter, aPerception } from "../../test/support/character.ts";
import { aScene, openGrid } from "../../test/support/context.ts";
import { gridOf, idOf } from "../../test/support/space.ts";
import { awareness, presenceView, proximityOf, threatAmong } from "./presence.ts";
import { tickContext } from "./scene.ts";

const DAY = tickContext(aScene(), 0);
/** Dawn in the unlit forest: DARK light, sight range 3. */
const DARK = tickContext(aScene({ startMinute: 0 }), 0);

describe("awareness (simulation-model §6)", () => {
  it("given someone 5 cells away in daylight when checking awareness then they are seen and heard", () => {
    expect(awareness(openGrid(25), DAY, 0, 5)).toStrictEqual({
      distance: 5,
      sees: true,
      hears: true,
    });
  });

  it("given someone 5 cells away in the dark when checking awareness then they are heard but not seen", () => {
    expect(awareness(openGrid(25), DARK, 0, 5)).toStrictEqual({
      distance: 5,
      sees: false,
      hears: true,
    });
  });

  it("given someone beyond a wall when checking awareness then they are neither seen nor heard", () => {
    expect(awareness(gridOf([".#."]), DAY, 0, 2)).toStrictEqual({
      distance: 2,
      sees: false,
      hears: false,
    });
  });

  it("given someone heard but not seen at 5 cells when computing proximity then they still count: 4000", () => {
    expect(proximityOf({ distance: 5, sees: false, hears: true })).toBe(4000);
  });

  it("given someone neither seen nor heard when computing proximity then it is 0", () => {
    expect(proximityOf({ distance: 1, sees: false, hears: false })).toBe(0);
  });
});

describe("presenceView (simulation-model §6 and §5.5)", () => {
  it("given a bond and no perception record when viewing a presence then the perceived threat is the preview, fearOf", () => {
    const observer = aCharacter(1, 0, {
      bonds: [aBond(2, { fearOf: 3000, trust: 4000, affection: 5000, resentment: 100 })],
    });

    expect(presenceView(observer, idOf(2), toBp(7000))).toStrictEqual({
      fearOf: 3000,
      resentment: 100,
      perceivedThreat: 3000,
      trust: 4000,
      affection: 5000,
      proximity: 7000,
    });
  });

  it("given a perception record when viewing a presence then the perceived threat comes from it", () => {
    const observer = aCharacter(1, 0, { perceptions: [aPerception(2, { perceivedThreat: 6500 })] });

    expect(presenceView(observer, idOf(2), toBp(10000)).perceivedThreat).toBe(6500);
  });
});

describe("threatAmong (simulation-model §6)", () => {
  const ALLEY = aScene({ place: { danger: 8000, comfort: 0, tags: [] } });
  const son = aCharacter(1, 0, { bonds: [aBond(2, { trust: 8000, affection: 9000 })] });

  it("given a son with trust 8000, affection 9000 and no fear toward his father when the father is adjacent then threat drops by 2125", () => {
    expect(threatAmong(son, [aCharacter(2, 1)], ALLEY.grid, ALLEY.place, DAY)).toBe(4000 - 2125);
  });

  it("given the same son when the father is 12 cells away then threat drops by 425", () => {
    expect(threatAmong(son, [aCharacter(2, 12)], ALLEY.grid, ALLEY.place, DAY)).toBe(4000 - 425);
  });

  it("given someone who fears the father when he is adjacent then the threat rises instead", () => {
    const fearful = aCharacter(1, 0, { bonds: [aBond(2, { fearOf: 8000 })] });

    expect(threatAmong(fearful, [aCharacter(2, 1)], ALLEY.grid, ALLEY.place, DAY)).toBe(
      4000 + 4000,
    );
  });
});
