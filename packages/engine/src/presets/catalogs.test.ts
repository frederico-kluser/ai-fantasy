import { describe, expect, it } from "vitest";

import { loadedPresets } from "../../test/support/catalog-patch.ts";
import { startsOffFloor, unreachableStarts } from "../../test/support/grid-walk.ts";
import { CATALOG_IDS, CATALOG_NAMES, catalogsSchema } from "./catalogs.ts";
import { gridTemplateSchema } from "./grid.ts";
import { SIGNAL_CAUSE_IDS } from "./signals.ts";

const presets = loadedPresets();

/** The counts the specification gives for each catalog (presets, dialogue-acts, simulation-model). */
const SPECIFIED_COUNTS = {
  bodyNeeds: 7,
  emotions: 10,
  drives: 15,
  bondAxes: 8,
  bondLabels: 24,
  traits: 10,
  aptitudes: 3,
  signals: 18,
  places: 10,
  weathers: 8,
  associationTags: 10,
  characterArchetypes: 16,
  bondArchetypes: 17,
  historyEvents: 21,
  dayStates: 7,
  acts: 20,
  tones: 6,
  topicTypes: 9,
  requestObjects: 9,
};

const reciprocals = new Map(presets.bondLabels.map((label) => [label.id, label.reciprocal]));

/** Each side of each bond archetype that holds a family or role label, with the other side's label. */
const familyAndRoleSides = presets.bondArchetypes
  .flatMap((archetype) => [
    { id: archetype.id, label: archetype.aToB.label, other: archetype.bToA.label },
    { id: archetype.id, label: archetype.bToA.label, other: archetype.aToB.label },
  ])
  .filter((side) => reciprocals.get(side.label) !== null);

describe("the default catalogs (presets, dialogue-acts §2 to §4, simulation-model §5 and §7)", () => {
  it("given the catalogs when counting then they match the counts in the specification", () => {
    expect(
      Object.fromEntries(CATALOG_NAMES.map((name) => [name, presets[name].length])),
    ).toStrictEqual(SPECIFIED_COUNTS);
  });

  it("given the signal causes when counting then there are 15", () => {
    expect(SIGNAL_CAUSE_IDS).toHaveLength(15);
  });

  it("given the catalog names when reading the schema then each name has one catalog, in order", () => {
    expect(Object.keys(catalogsSchema.shape)).toStrictEqual(CATALOG_NAMES);
    expect(Object.keys(CATALOG_IDS)).toStrictEqual(CATALOG_NAMES);
  });

  it("given the directional bond archetypes when loading then each of the six is flagged as directional", () => {
    const directional = presets.bondArchetypes.filter((archetype) => archetype.directional);

    expect(directional.map((archetype) => archetype.id)).toStrictEqual([
      "parent_child",
      "creditor_debtor",
      "mentor_apprentice",
      "boss_employee",
      "unrequited_love",
      "protector_protected",
    ]);
  });

  it("given the bond archetypes when loading then every family and role label has its reciprocal", () => {
    const expected = familyAndRoleSides.map((side) => ({
      ...side,
      other: reciprocals.get(side.label),
    }));

    expect(familyAndRoleSides).toHaveLength(14);
    expect(familyAndRoleSides).toStrictEqual(expected);
  });

  it.each(presets.places.map((place) => [place.id, place] as const))(
    "given the %s grid template when validating then it has at least one EXIT and only known cell types",
    (_id, place) => {
      expect(place.grid.exits.length).toBeGreaterThan(0);
      expect(place.grid.rows.join("")).toMatch(/^[.,dD=o#]+$/);
      expect(gridTemplateSchema.safeParse(place.grid).success).toBe(true);
    },
  );

  it.each(presets.places.map((place) => [place.id, place] as const))(
    "given the %s grid template when walking from each start then an exit is reachable from floor",
    (_id, place) => {
      expect(startsOffFloor(place)).toStrictEqual([]);
      expect(unreachableStarts(place)).toStrictEqual([]);
    },
  );
});
