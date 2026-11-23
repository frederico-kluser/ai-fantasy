import { describe, expect, it } from "vitest";

import { DEFAULT_CATALOGS } from "../presets/catalogs.ts";
import { idOf } from "../../test/support/space.ts";
import { someDrives } from "../../test/support/character.ts";
import {
  directedDeficit,
  directedTarget,
  DIRECTED_DRIVE_IDS,
  dominantDrives,
  DRIVE_LEVELS,
  highestDeficit,
  withDirectedDeficit,
} from "./drives.ts";

describe("drive levels and directed drives (simulation-model §5.3)", () => {
  it("given the drive catalog when reading the levels then the engine table matches it", () => {
    const catalog = Object.fromEntries(
      DEFAULT_CATALOGS.drives.map((drive) => [drive.id, drive.level]),
    );

    expect(DRIVE_LEVELS).toStrictEqual(catalog);
  });

  it("given the drive catalog when listing the directed drives then the engine list matches it", () => {
    const catalog = DEFAULT_CATALOGS.drives
      .filter((drive) => drive.directed)
      .map((drive) => drive.id);

    expect(DIRECTED_DRIVE_IDS).toStrictEqual(catalog);
  });
});

describe("directed deficits (simulation-model §5.3)", () => {
  it("given a deficit toward 2 when reading it then it is that deficit", () => {
    const drives = someDrives({ directed: { care: [[2, 4000]] } });

    expect(directedDeficit(drives, "care", idOf(2))).toBe(4000);
  });

  it("given no entry toward 5 when reading the deficit then it is 0", () => {
    expect(directedDeficit(someDrives({ directed: { care: [[2, 4000]] } }), "care", idOf(5))).toBe(
      0,
    );
  });

  it("given entries toward 1 and 4 when setting one toward 3 then the list stays sorted by id", () => {
    const drives = someDrives({
      directed: {
        desire: [
          [1, 100],
          [4, 400],
        ],
      },
    });

    expect(withDirectedDeficit(drives.directed.desire, idOf(3), 300)).toStrictEqual([
      { target: 1, deficit: 100 },
      { target: 3, deficit: 300 },
      { target: 4, deficit: 400 },
    ]);
  });

  it("given an entry toward 4 when setting it again then it is replaced, clamped to 10000", () => {
    const drives = someDrives({ directed: { desire: [[4, 400]] } });

    expect(withDirectedDeficit(drives.directed.desire, idOf(4), 12000)).toStrictEqual([
      { target: 4, deficit: 10000 },
    ]);
  });
});

describe("highestDeficit (simulation-model §5.3)", () => {
  it("given an undirected drive when reading its highest deficit then it is its deficit", () => {
    expect(highestDeficit(someDrives({ deficits: { company: 3500 } }), "company")).toBe(3500);
  });

  it("given a directed drive with several targets when reading its highest deficit then it is the largest", () => {
    const drives = someDrives({
      directed: {
        justice: [
          [1, 2000],
          [3, 6000],
          [4, 5000],
        ],
      },
    });

    expect(highestDeficit(drives, "justice")).toBe(6000);
  });

  it("given a directed drive without entries when reading its highest deficit then it is 0", () => {
    expect(highestDeficit(someDrives(), "intimacy")).toBe(0);
  });
});

describe("directedTarget (simulation-model §5.3)", () => {
  it("given several present targets when choosing the target then it is the one with the highest deficit", () => {
    const drives = someDrives({
      directed: {
        care: [
          [1, 2000],
          [3, 6000],
          [4, 7000],
        ],
      },
    });

    expect(directedTarget(drives, "care", [idOf(1), idOf(3)])).toBe(3);
  });

  it("given a tie when choosing the target then the lowest id wins", () => {
    const drives = someDrives({
      directed: {
        care: [
          [2, 5000],
          [6, 5000],
        ],
      },
    });

    expect(directedTarget(drives, "care", [idOf(6), idOf(2)])).toBe(2);
  });

  it("given present targets with no deficit when choosing the target then the lowest id wins", () => {
    expect(directedTarget(someDrives(), "care", [idOf(4), idOf(3)])).toBe(3);
  });

  it("given nobody present when choosing the target then there is none", () => {
    expect(directedTarget(someDrives(), "care", [])).toBeNull();
  });
});

describe("dominantDrives (simulation-model §5.3)", () => {
  it("given weights 7000 and 6999 when listing the dominant drives then only the first is dominant, in catalog order", () => {
    const drives = someDrives({ weights: { fun: 7000, curiosity: 9000, care: 6999 } });

    expect(dominantDrives(drives)).toStrictEqual(["curiosity", "fun"]);
  });
});
