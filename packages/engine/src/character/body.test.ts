import { describe, expect, it } from "vitest";

import { toBipolarBp } from "../domain/bp.ts";
import { aBody, ticksOfBody } from "../../test/support/character.ts";
import { bodyTick, greatestNeed, needBand, type BodyTickInput } from "./body.ts";

/** A morning tick on a covered cell at a neutral temperature, standing still and calm. */
const CALM_MORNING: BodyTickInput = {
  phase: "MORNING",
  cellsWalked: 0,
  aroused: false,
  thermalTarget: toBipolarBp(0),
};

describe("bodyTick: fatigue (simulation-model §5.1)", () => {
  it("given a resting character in the morning when 720 ticks pass then fatigue rises by 1440", () => {
    expect(ticksOfBody(aBody(), CALM_MORNING, 720).fatigue).toBe(1440);
  });

  it.each([
    ["LATE_NIGHT", 3],
    ["DAWN", 4],
    ["EVENING", 2],
    ["AFTERNOON", 2],
  ] as const)("given the %s phase when a tick passes then fatigue rises by %i", (phase, rise) => {
    expect(bodyTick(aBody(), { ...CALM_MORNING, phase }).fatigue).toBe(rise);
  });

  it("given a character that walked a cell when a tick passes then fatigue rises by 5 more", () => {
    expect(bodyTick(aBody(), { ...CALM_MORNING, cellsWalked: 1 }).fatigue).toBe(7);
  });

  it("given fear or anger at 7000 or more when a tick passes then fatigue rises by 1 more", () => {
    expect(bodyTick(aBody(), { ...CALM_MORNING, aroused: true }).fatigue).toBe(3);
  });

  it("given fatigue at 10000 when a tick passes then it stays at 10000", () => {
    expect(bodyTick(aBody({ fatigue: 10000 }), CALM_MORNING).fatigue).toBe(10000);
  });
});

describe("bodyTick: the other needs (simulation-model §5.1)", () => {
  it("given hunger, thirst and bladder at 100 when a tick passes then they rise by 1, 2 and 3", () => {
    const body = bodyTick(aBody({ hunger: 100, thirst: 100, bladder: 100 }), CALM_MORNING);

    expect([body.hunger, body.thirst, body.bladder]).toStrictEqual([101, 102, 103]);
  });

  it.each([
    [3000, 5],
    [2999, 2],
  ] as const)("given thermal %i when a tick passes then thirst rises by %i", (thermal, rise) => {
    const body = bodyTick(aBody({ thermal }), {
      ...CALM_MORNING,
      thermalTarget: toBipolarBp(thermal),
    });

    expect(body.thirst).toBe(rise);
  });

  it("given pain and intoxication at 50 when a tick passes then both recover by 1", () => {
    const body = bodyTick(aBody({ pain: 50, intoxication: 50 }), CALM_MORNING);

    expect([body.pain, body.intoxication]).toStrictEqual([49, 49]);
  });

  it("given pain and intoxication at 0 when a tick passes then both stay at 0", () => {
    const body = bodyTick(aBody(), CALM_MORNING);

    expect([body.pain, body.intoxication]).toStrictEqual([0, 0]);
  });

  it("given thermal 0 and a target of -4000 when a tick passes then thermal approaches it by 50 bp: -20", () => {
    expect(bodyTick(aBody(), { ...CALM_MORNING, thermalTarget: toBipolarBp(-4000) }).thermal).toBe(
      -20,
    );
  });

  it("given hunger, thirst and bladder at 10000 when a tick passes then they stay at 10000", () => {
    const body = bodyTick(aBody({ hunger: 10000, thirst: 10000, bladder: 10000 }), CALM_MORNING);

    expect([body.hunger, body.thirst, body.bladder]).toStrictEqual([10000, 10000, 10000]);
  });
});

describe("greatestNeed (simulation-model §5.1)", () => {
  it.each([
    ["fatigue", 6100],
    ["hunger", 6200],
    ["thirst", 6300],
    ["bladder", 6400],
    ["pain", 6500],
    ["intoxication", 6600],
  ] as const)(
    "given %s as the highest need when finding the greatest then it is %i",
    (need, value) => {
      expect(greatestNeed(aBody({ fatigue: 6000, [need]: value }))).toBe(value);
    },
  );

  it("given a cold of -7000 above the other needs when finding the greatest then it is 7000", () => {
    expect(greatestNeed(aBody({ fatigue: 6000, thermal: -7000 }))).toBe(7000);
  });
});

describe("needBand (simulation-model §5.1)", () => {
  it.each([
    [4999, "NONE"],
    [5000, "DISCOMFORT"],
    [7499, "DISCOMFORT"],
    [7500, "URGENT"],
    [8999, "URGENT"],
    [9000, "CRITICAL"],
  ] as const)("given a need of %i when banding it then it is %s", (value, band) => {
    expect(needBand(value)).toBe(band);
  });
});
