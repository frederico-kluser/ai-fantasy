import { describe, expect, it } from "vitest";

import { toBipolarBp, toBp } from "../domain/bp.ts";
import { someDrives } from "../../test/support/character.ts";
import { idOf } from "../../test/support/space.ts";
import { drivesTick, type DriveTickInput } from "./drive-tick.ts";

/** A quiet tick: no need, no threat, an act going on, neutral sociability, nobody around. */
const QUIET: DriveTickInput = {
  greatestNeed: toBp(0),
  threat: toBp(0),
  silence: false,
  sociability: toBipolarBp(0),
  boredom: toBp(0),
  visibleAttractions: [],
  distresses: [],
};

describe("drivesTick (simulation-model §5.3)", () => {
  it.each([
    [7500, 5000],
    [5000, 0],
    [10000, 10000],
  ] as const)(
    "given the greatest need %i when a tick passes then physical relief is %i",
    (need, relief) => {
      expect(
        drivesTick(someDrives(), { ...QUIET, greatestNeed: toBp(need) }).deficits.physical_relief,
      ).toBe(relief);
    },
  );

  it("given threat 8000 and safety 0 when a tick passes then safety approaches it at 1000: 800", () => {
    expect(
      drivesTick(someDrives(), { ...QUIET, threat: toBp(8000) }).deficits.physical_safety,
    ).toBe(800);
  });

  it("given predictability, company and curiosity at 100 when a tick passes then they are 99, 101 and 101", () => {
    const drives = someDrives({ deficits: { predictability: 100, company: 100, curiosity: 100 } });
    const { deficits } = drivesTick(drives, QUIET);

    expect([deficits.predictability, deficits.company, deficits.curiosity]).toStrictEqual([
      99, 101, 101,
    ]);
  });

  it("given predictability at 0 when a tick passes then it stays at 0", () => {
    expect(drivesTick(someDrives(), QUIET).deficits.predictability).toBe(0);
  });

  it.each([
    [10000, 6],
    [0, 3],
    [-10000, 1],
  ] as const)(
    "given sociability %i in a tick of silence when it passes then company rises by %i",
    (sociability, rise) => {
      const input = { ...QUIET, silence: true, sociability: toBipolarBp(sociability) };

      expect(drivesTick(someDrives(), input).deficits.company).toBe(rise);
    },
  );

  it.each([
    [5000, 2],
    [4999, 0],
  ] as const)("given boredom %i when a tick passes then fun rises by %i", (boredom, rise) => {
    expect(drivesTick(someDrives(), { ...QUIET, boredom: toBp(boredom) }).deficits.fun).toBe(rise);
  });

  it("given attraction 8000 toward a present visible Y when a tick passes then desire toward Y approaches it at 500: 400", () => {
    const input = { ...QUIET, visibleAttractions: [{ target: idOf(2), value: toBp(8000) }] };

    expect(drivesTick(someDrives(), input).directed.desire).toStrictEqual([
      { target: 2, deficit: 400 },
    ]);
  });

  it("given apparent distress 9000 of a present Y when a tick passes then care toward Y approaches it at 1000: 900", () => {
    const drives = someDrives({
      directed: {
        care: [
          [1, 0],
          [3, 500],
        ],
      },
    });
    const input = { ...QUIET, distresses: [{ target: idOf(3), value: toBp(9000) }] };

    expect(drivesTick(drives, input).directed.care).toStrictEqual([
      { target: 1, deficit: 0 },
      { target: 3, deficit: 1350 },
    ]);
  });

  it("given intimacy and justice toward someone when a tick passes then they do not change", () => {
    const drives = someDrives({ directed: { intimacy: [[2, 3000]], justice: [[2, 4000]] } });
    const { directed } = drivesTick(drives, QUIET);

    expect([directed.intimacy, directed.justice]).toStrictEqual([
      drives.directed.intimacy,
      drives.directed.justice,
    ]);
  });

  it("given recognition, dignity and the weights when a tick passes then event-driven drives and weights do not change", () => {
    const drives = someDrives({
      weights: { dignity: 8000 },
      deficits: { recognition: 4000, dignity: 2000 },
    });
    const after = drivesTick(drives, QUIET);

    expect([after.weights, after.deficits.recognition, after.deficits.dignity]).toStrictEqual([
      drives.weights,
      4000,
      2000,
    ]);
  });
});
