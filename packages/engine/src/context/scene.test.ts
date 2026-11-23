import { describe, expect, it } from "vitest";

import { toBp } from "../domain/bp.ts";
import { aScene } from "../../test/support/context.ts";
import { presentTags, sceneNoise, thermalTarget, tickContext } from "./scene.ts";

describe("thermalTarget (simulation-model §3.2)", () => {
  it("given a character on an uncovered cell in snow when ticking then the thermal target is the full weather temperature", () => {
    expect(thermalTarget(0, -4000, false)).toBe(-4000);
  });

  it("given a character on a covered cell in snow when ticking then the thermal target is a quarter of it", () => {
    expect(thermalTarget(0, -4000, true)).toBe(-1000);
  });

  it("given a warm home under a covered roof in heat when ticking then the base temperature adds: 2000", () => {
    expect(thermalTarget(1000, 4000, true)).toBe(2000);
  });

  it("given a base of 9000 and heat outside when ticking then the target is clamped to 10000", () => {
    expect(thermalTarget(9000, 4000, false)).toBe(10000);
  });
});

describe("presentTags (simulation-model §5.7)", () => {
  it("given a forest in clear weather by day when listing present tags then only the place tags are present", () => {
    expect(presentTags(["forest"], "clear", "DAY")).toStrictEqual(["forest"]);
  });

  it("given a storm and DARK light when listing present tags then storm and dark join, in catalog order", () => {
    expect(presentTags(["crowd", "forest"], "storm", "DARK")).toStrictEqual([
      "forest",
      "dark",
      "crowd",
      "storm",
    ]);
  });

  it("given a place tagged dark under DARK light when listing present tags then dark appears once", () => {
    expect(presentTags(["dark"], "clear", "DARK")).toStrictEqual(["dark"]);
  });

  it("given DIM light when listing present tags then dark is not present", () => {
    expect(presentTags([], "clear", "DIM")).toStrictEqual([]);
  });
});

describe("sceneNoise (simulation-model §6)", () => {
  it("given place noise 9000 and a storm of 3000 when computing noise then it is limited to 10000", () => {
    expect(sceneNoise(toBp(9000), toBp(3000))).toBe(10000);
  });
});

describe("tickContext (simulation-model §3.2 and §16 step 6.4)", () => {
  it("given an unlit forest late at night when computing the tick context then it is DARK with vision 3 and dark present", () => {
    const context = tickContext(aScene({ startMinute: 1350 }), 0);

    expect(context).toStrictEqual({
      phase: "LATE_NIGHT",
      light: "DARK",
      vision: 3,
      noise: 1000,
      presentTags: ["forest", "dark"],
    });
  });

  it("given a morning start when 2160 ticks pass then the clock reaches the afternoon", () => {
    expect(tickContext(aScene({ startMinute: 540 }), 2160).phase).toBe("AFTERNOON");
  });

  it("given a lit place with the dark tag at dawn when computing the tick context then it is DARK", () => {
    const scene = aScene({
      startMinute: 0,
      place: { lit: true, tags: ["dark"], exposure: "NONE" },
    });

    expect(tickContext(scene, 0).light).toBe("DARK");
  });

  it("given a storm over an exposed place in the morning when computing the tick context then light is DIM", () => {
    expect(tickContext(aScene({ weather: "storm" }), 0).light).toBe("DIM");
  });

  it("given a storm over a roofed place in the morning when computing the tick context then light stays DAY", () => {
    expect(tickContext(aScene({ weather: "storm", place: { exposure: "NONE" } }), 0).light).toBe(
      "DAY",
    );
  });

  it("given fog over an exposed place in the morning when computing the tick context then vision is halved to 10", () => {
    expect(tickContext(aScene({ weather: "fog" }), 0).vision).toBe(10);
  });

  it("given fog over a roofed place when computing the tick context then vision stays 20", () => {
    expect(tickContext(aScene({ weather: "fog", place: { exposure: "NONE" } }), 0).vision).toBe(20);
  });

  it("given rain in a quiet place when computing the tick context then the noise adds the weather: 2500", () => {
    expect(tickContext(aScene({ weather: "rain" }), 0).noise).toBe(2500);
  });
});
