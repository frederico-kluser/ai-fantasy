/**
 * Test support for the context module: scenes built from a few overrides. The
 * default is an unlit forest (the `wilderness` place: danger 4000, comfort
 * 3000, noise 1000, exposed to the weather) in clear weather, starting in the
 * morning, on an open 25 × 25 grid with no roof.
 */
import fc from "fast-check";

import type { ScenePlace, SceneContext } from "../../src/context/scene.ts";
import type { PresenceView, ThreatInput } from "../../src/context/threat.ts";
import { toBp } from "../../src/domain/bp.ts";
import { LIGHT_LEVELS } from "../../src/time/light.ts";
import { WEATHERS } from "../../src/presets/weathers.ts";
import type { WeatherId } from "../../src/presets/weathers.ts";
import type { Grid } from "../../src/space/grid.ts";
import { gridOf } from "./space.ts";

/** An open grid of floor, `side` × `side`, with the roofed cells given. */
export function openGrid(side: number, roofed: readonly number[] = []): Grid {
  return gridOf(
    Array.from({ length: side }, () => ".".repeat(side)),
    { roofed },
  );
}

const FOREST: ScenePlace = {
  danger: 4000,
  comfort: 3000,
  noise: 1000,
  baseTemperature: 0,
  lit: false,
  tags: ["forest"],
  exposure: "FULL",
};

/** Overrides of {@link aScene}. */
export interface SceneOverrides {
  readonly place?: Partial<ScenePlace>;
  readonly weather?: WeatherId;
  readonly startMinute?: number;
  readonly grid?: Grid;
}

/** A scene with the overrides given (see the module comment for the defaults). */
export function aScene(overrides: SceneOverrides = {}): SceneContext {
  const weatherId = overrides.weather ?? "clear";
  const weather = WEATHERS.find((entry) => entry.id === weatherId);
  if (weather === undefined) {
    throw new Error(`test scene: unknown weather ${weatherId}`);
  }
  return {
    grid: overrides.grid ?? openGrid(25),
    place: { ...FOREST, ...overrides.place },
    weather: { id: weather.id, temperature: weather.temperature, extraNoise: weather.extraNoise },
    startMinute: overrides.startMinute ?? 540,
  };
}

/** The menace and relief axes of a presence (the bond and perception of X toward Y). */
export type PresenceAxes = Omit<PresenceView, "proximity">;

/** How X sees Y at `proximity`, every axis at 0 but the overrides given. */
export function aPresence(
  axes: Partial<Record<keyof PresenceAxes, number>>,
  proximity: number,
): PresenceView {
  return {
    fearOf: toBp(axes.fearOf ?? 0),
    resentment: toBp(axes.resentment ?? 0),
    perceivedThreat: toBp(axes.perceivedThreat ?? 0),
    trust: toBp(axes.trust ?? 0),
    affection: toBp(axes.affection ?? 0),
    proximity: toBp(proximity),
  };
}

/** A threat input with no danger, no comfort, `DAY` light, no tag and nobody, with the overrides given. */
export function someThreat(
  overrides: Partial<Omit<ThreatInput, "danger" | "comfort">> & {
    danger?: number;
    comfort?: number;
  } = {},
): ThreatInput {
  return {
    light: overrides.light ?? "DAY",
    tagValences: overrides.tagValences ?? [],
    presences: overrides.presences ?? [],
    danger: toBp(overrides.danger ?? 0),
    comfort: toBp(overrides.comfort ?? 0),
  };
}

const bpValue = fc.integer({ min: 0, max: 10000 });
const proximityValue = fc.constantFrom(0, 2000, 4000, 7000, 10000);

/** A random presence: any axes, at any proximity of the table of simulation-model §6. */
export function arbitraryPresence(): fc.Arbitrary<PresenceView> {
  return fc
    .record({
      fearOf: bpValue,
      resentment: bpValue,
      perceivedThreat: bpValue,
      trust: bpValue,
      affection: bpValue,
      proximity: proximityValue,
    })
    .map(({ proximity, ...axes }) => aPresence(axes, proximity));
}

/** A random threat input and a trusted Y with no menace (invariant 4 of simulation-model §18). */
export function arbitraryTrustedPresence(): fc.Arbitrary<{
  input: ThreatInput;
  trusted: Partial<Record<keyof PresenceAxes, number>>;
}> {
  const trustedValue = fc.integer({ min: 6000, max: 10000 });
  return fc.record({
    input: fc
      .record({
        danger: bpValue,
        comfort: bpValue,
        light: fc.constantFrom(...LIGHT_LEVELS),
        tagValences: fc.array(fc.integer({ min: -10000, max: 10000 }), { maxLength: 3 }),
        presences: fc.array(arbitraryPresence(), { maxLength: 6 }),
      })
      .map((drawn) => someThreat(drawn)),
    trusted: fc.record({ trust: trustedValue, affection: trustedValue }),
  });
}
