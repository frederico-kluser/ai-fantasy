import { describe, expect, it } from "vitest";

import { patchPreset } from "../../test/support/catalog-patch.ts";
import { err } from "../domain/result.ts";
import { DEFAULT_CATALOGS } from "./catalogs.ts";
import { loadPresets } from "./load.ts";

/** The roofing of the default market (a partial mask), to break it on purpose. */
const MARKET_GRID = DEFAULT_CATALOGS.places[3]?.grid;

describe("rules inside one preset (presets §2 to §7, dialogue-acts §3)", () => {
  it.each([
    ["home", "FULL", 0, 'a place exposed to the weather has roofed "NONE"'],
    ["public_square", "NONE", 4, 'a place not exposed to the weather has roofed "ALL"'],
    ["market", "NONE", 3, 'a place not exposed to the weather has roofed "ALL"'],
    ["home", "PARTIAL", 0, "a partly exposed place has a mask with roofed and open cells"],
  ] as const)(
    "given %s with exposure %s when loading then its roofing is reported",
    (id, exposure, index, message) => {
      expect(loadPresets(patchPreset("places", id, { exposure }))).toStrictEqual(
        err([
          {
            code: "INVALID_PRESET",
            catalog: "places",
            index,
            presetId: id,
            path: "grid.roofed",
            message,
          },
        ]),
      );
    },
  );

  it.each([
    ["only roofed cells", MARKET_GRID?.rows.map((row) => "r".repeat(row.length))],
    ["only open cells", MARKET_GRID?.rows.map((row) => ".".repeat(row.length))],
  ])(
    "given a partly exposed place with a mask of %s when loading then it fails",
    (_case, roofed) => {
      const grid = { ...MARKET_GRID, roofed };

      expect(loadPresets(patchPreset("places", "market", { grid }))).toMatchObject(
        err([
          {
            presetId: "market",
            path: "grid.roofed",
            message: "a partly exposed place has a mask with roofed and open cells",
          },
        ]),
      );
    },
  );

  it("given a partial mask with one fully roofed row and open cells elsewhere when loading then it loads", () => {
    const roofed = ["r".repeat(20), ...Array.from({ length: 13 }, () => ".".repeat(20))];

    expect(
      loadPresets(patchPreset("places", "market", { grid: { ...MARKET_GRID, roofed } })).ok,
    ).toBe(true);
  });

  it.each([
    ["siblings", true, 1, "a directional archetype has different labels for A and B"],
    ["parent_child", false, 0, "an archetype with different labels for A and B is directional"],
  ] as const)(
    "given the bond archetype %s marked directional %s when loading then the mark is reported",
    (id, directional, index, message) => {
      expect(loadPresets(patchPreset("bondArchetypes", id, { directional }))).toStrictEqual(
        err([
          {
            code: "INVALID_PRESET",
            catalog: "bondArchetypes",
            index,
            presetId: id,
            path: "directional",
            message,
          },
        ]),
      );
    },
  );

  it("given a history event that is never secret but known by A only when loading then it fails", () => {
    expect(
      loadPresets(patchPreset("historyEvents", "helped_in_crisis", { knownBy: "A" })),
    ).toStrictEqual(
      err([
        {
          code: "INVALID_PRESET",
          catalog: "historyEvents",
          index: 0,
          presetId: "helped_in_crisis",
          path: "knownBy",
          message: "an event that is never secret is known by both",
        },
      ]),
    );
  });

  it("given a history event that is sometimes secret and known by A when loading then it loads", () => {
    expect(loadPresets(patchPreset("historyEvents", "stole", { secretChance: 1 })).ok).toBe(true);
  });

  it("given a tone confused with itself when loading then the confusion is reported", () => {
    const confusions = [{ tone: "WARM", kind: "BETTER" }];

    expect(loadPresets(patchPreset("tones", "WARM", { confusions }))).toStrictEqual(
      err([
        {
          code: "INVALID_PRESET",
          catalog: "tones",
          index: 0,
          presetId: "WARM",
          path: "confusions.0.tone",
          message: "a tone is not confused with itself",
        },
      ]),
    );
  });

  it("given a tone with a repeated confusion when loading then the repeat is reported", () => {
    const confusions = [
      { tone: "AGGRESSIVE", kind: "WORSE" },
      { tone: "IRONIC", kind: "WORSE" },
      { tone: "AGGRESSIVE", kind: "BETTER" },
    ];

    expect(loadPresets(patchPreset("tones", "PLAYFUL", { confusions }))).toMatchObject(
      err([{ presetId: "PLAYFUL", path: "confusions.2.tone", message: "AGGRESSIVE is repeated" }]),
    );
  });

  it.each([
    ["one dominant drive", { dominantDrives: ["care"] }, "dominantDrives"],
    [
      "four dominant drives",
      { dominantDrives: ["care", "intimacy", "company", "fun"] },
      "dominantDrives",
    ],
    ["a repeated dominant drive", { dominantDrives: ["care", "care"] }, "dominantDrives.1"],
    ["a repeated high aptitude", { highAptitudes: ["memory", "memory"] }, "highAptitudes.1"],
    ["a trait out of the bipolar scale", { traits: { empathy: 10001 } }, "traits.empathy"],
    ["no examples", { examples: [] }, "examples"],
  ])(
    "given a character archetype with %s when loading then the field is reported",
    (_case, patch, path) => {
      expect(loadPresets(patchPreset("characterArchetypes", "caretaker", patch))).toMatchObject(
        err([{ catalog: "characterArchetypes", presetId: "caretaker", path }]),
      );
    },
  );

  it.each([
    ["a tick count of 0", { ticks: 0 }, "ticks"],
    ["a secret tick count of 0", { secretTicks: 0 }, "secretTicks"],
    ["no accepted topic", { topics: [] }, "topics"],
    ["another topic word", { topics: "ANY" }, "topics"],
  ])("given the act TELL with %s when loading then the field is reported", (_case, patch, path) => {
    expect(loadPresets(patchPreset("acts", "TELL", patch))).toMatchObject(
      err([{ catalog: "acts", presetId: "TELL", path }]),
    );
  });

  it.each([
    ["no causes", { causes: [] }, "causes"],
    ["a repeated cause", { causes: ["fear", "fear"] }, "causes.1"],
    ["an unknown cause", { causes: ["surprise"] }, "causes.0"],
  ])(
    "given the signal tremor with %s when loading then the field is reported",
    (_case, patch, path) => {
      expect(loadPresets(patchPreset("signals", "tremor", patch))).toMatchObject(
        err([{ catalog: "signals", presetId: "tremor", path }]),
      );
    },
  );

  it("given a day state range with min above max when loading then the range is reported", () => {
    const body = { fatigue: { min: 7500, max: 6000 } };

    expect(loadPresets(patchPreset("dayStates", "tired", { body }))).toMatchObject(
      err([
        {
          catalog: "dayStates",
          presetId: "tired",
          path: "body.fatigue",
          message: "min is above max",
        },
      ]),
    );
  });
});

describe("rules across catalogs (simulation-model §5.1, §5.3 and §5.4, presets §6)", () => {
  it("given a parent_child archetype whose B label is not CHILD when loading then both sides are reported", () => {
    const bToA = { label: "SIBLING", axes: {} };

    expect(loadPresets(patchPreset("bondArchetypes", "parent_child", { bToA }))).toStrictEqual(
      err([
        {
          code: "INCONSISTENT",
          catalog: "bondArchetypes",
          index: 0,
          presetId: "parent_child",
          path: "aToB.label",
          message: "PARENT must be SIBLING, the reciprocal of SIBLING",
        },
        {
          code: "INCONSISTENT",
          catalog: "bondArchetypes",
          index: 0,
          presetId: "parent_child",
          path: "bToA.label",
          message: "SIBLING must be CHILD, the reciprocal of PARENT",
        },
      ]),
    );
  });

  it("given a social label on one side when loading then the other side may hold any label", () => {
    const aToB = { label: "FRIEND", axes: {} };

    expect(loadPresets(patchPreset("bondArchetypes", "unrequited_love", { aToB })).ok).toBe(true);
  });

  it("given an undirected drive listed as directed in a bond archetype when loading then it is reported", () => {
    const aToB = { label: "ENEMY", axes: {}, directedDrives: ["justice", "dignity"] };

    expect(loadPresets(patchPreset("bondArchetypes", "enemies", { aToB }))).toStrictEqual(
      err([
        {
          code: "INCONSISTENT",
          catalog: "bondArchetypes",
          index: 7,
          presetId: "enemies",
          path: "aToB.directedDrives.1",
          message: "dignity is not a directed drive",
        },
      ]),
    );
  });

  it("given an undirected drive on the B side when loading then that side is reported", () => {
    const bToA = { label: "CHILD", axes: {}, directedDrives: ["company"] };

    expect(loadPresets(patchPreset("bondArchetypes", "parent_child", { bToA }))).toMatchObject(
      err([{ presetId: "parent_child", path: "bToA.directedDrives.0" }]),
    );
  });

  it("given a role label whose reciprocal has another kind when loading then both labels are reported", () => {
    expect(loadPresets(patchPreset("bondLabels", "CREDITOR", { kind: "FAMILY" }))).toStrictEqual(
      err([
        {
          code: "INCONSISTENT",
          catalog: "bondLabels",
          index: 11,
          presetId: "CREDITOR",
          path: "reciprocal",
          message: "DEBTOR must be a FAMILY label whose reciprocal is CREDITOR",
        },
        {
          code: "INCONSISTENT",
          catalog: "bondLabels",
          index: 12,
          presetId: "DEBTOR",
          path: "reciprocal",
          message: "CREDITOR must be a ROLE label whose reciprocal is DEBTOR",
        },
      ]),
    );
  });

  it("given a reciprocal that does not point back when loading then the label is reported", () => {
    const catalogs = patchPreset("bondLabels", "GRANDPARENT", { reciprocal: "CHILD" });

    expect(loadPresets(catalogs)).toMatchObject(
      err([
        {
          catalog: "bondLabels",
          presetId: "GRANDPARENT",
          message: "CHILD must be a FAMILY label whose reciprocal is GRANDPARENT",
        },
        {
          catalog: "bondLabels",
          presetId: "GRANDCHILD",
          message: "GRANDPARENT must be a FAMILY label whose reciprocal is GRANDCHILD",
        },
      ]),
    );
  });

  it.each([
    ["a social label with a reciprocal", "FRIEND", { reciprocal: "FRIEND" }],
    ["a family label without one", "SIBLING", { reciprocal: null }],
  ])("given %s when loading then the reciprocal is reported", (_case, id, patch) => {
    expect(loadPresets(patchPreset("bondLabels", id, patch))).toMatchObject(
      err([{ code: "INVALID_PRESET", catalog: "bondLabels", presetId: id, path: "reciprocal" }]),
    );
  });

  it("given a day state with a negative range for a unipolar need when loading then it is reported", () => {
    const body = { fatigue: { min: -1, max: 7500 } };

    expect(loadPresets(patchPreset("dayStates", "tired", { body }))).toStrictEqual(
      err([
        {
          code: "INCONSISTENT",
          catalog: "dayStates",
          index: 1,
          presetId: "tired",
          path: "body.fatigue.min",
          message: "fatigue is unipolar: its range starts at 0 or more",
        },
      ]),
    );
  });

  it("given a day state with a negative range for the thermal need when loading then it loads", () => {
    const body = { thermal: { min: -2000, max: -1000 } };

    expect(loadPresets(patchPreset("dayStates", "tired", { body })).ok).toBe(true);
  });
});
