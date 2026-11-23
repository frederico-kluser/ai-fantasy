import { describe, expect, it } from "vitest";

import {
  patchPreset,
  withCatalog,
  withoutCatalog,
  withoutPreset,
  withRepeatedPreset,
} from "../../test/support/catalog-patch.ts";
import { err } from "../domain/result.ts";
import { CATALOG_IDS, CATALOG_NAMES, DEFAULT_CATALOGS } from "./catalogs.ts";
import { loadPresets } from "./load.ts";

const idsOf = (name: (typeof CATALOG_NAMES)[number]) =>
  DEFAULT_CATALOGS[name].map((entry: { readonly id: string }) => entry.id);

describe("loading the presets (presets §1)", () => {
  it("given the default catalogs when loading then the presets load without errors", () => {
    expect(loadPresets().ok).toBe(true);
  });

  it("given no argument when loading then the default catalogs are the ones loaded", () => {
    expect(loadPresets()).toStrictEqual(loadPresets(DEFAULT_CATALOGS));
  });

  it("given a preset with an unknown trait id when loading then validation fails naming the preset", () => {
    const catalogs = patchPreset("characterArchetypes", "caretaker", { traits: { bravery: 5000 } });

    expect(loadPresets(catalogs)).toStrictEqual(
      err([
        {
          code: "INVALID_PRESET",
          catalog: "characterArchetypes",
          index: 0,
          presetId: "caretaker",
          path: "traits.bravery",
          message: 'Unrecognized key: "bravery"',
        },
      ]),
    );
  });

  it("given a value that is not an object when loading then one error names no catalog", () => {
    expect(loadPresets("presets")).toStrictEqual(
      err([
        {
          code: "INVALID_CATALOGS",
          catalog: null,
          index: null,
          presetId: null,
          path: "",
          message: "Invalid input: expected object, received string",
        },
      ]),
    );
  });

  it("given a missing catalog when loading then the error names the catalog", () => {
    expect(loadPresets(withoutCatalog("places"))).toStrictEqual(
      err([
        {
          code: "INVALID_CATALOGS",
          catalog: "places",
          index: null,
          presetId: null,
          path: "",
          message: "Invalid input: expected array, received undefined",
        },
      ]),
    );
  });

  it("given an unknown catalog name when loading then the error names it", () => {
    expect(loadPresets({ ...DEFAULT_CATALOGS, moods: [] })).toStrictEqual(
      err([
        {
          code: "INVALID_CATALOGS",
          catalog: null,
          index: null,
          presetId: null,
          path: "moods",
          message: 'Unrecognized key: "moods"',
        },
      ]),
    );
  });

  it("given a catalog that is not an array when loading then the error names the catalog", () => {
    expect(loadPresets(withCatalog("weathers", { clear: {} }))).toStrictEqual(
      err([
        {
          code: "INVALID_CATALOGS",
          catalog: "weathers",
          index: null,
          presetId: null,
          path: "",
          message: "Invalid input: expected array, received object",
        },
      ]),
    );
  });

  it.each([null, undefined, "storm", 7, ["clear"]])(
    "given the entry %s that is not an object when loading then the error has its index and no preset id",
    (entry) => {
      const catalogs = withCatalog("weathers", [...DEFAULT_CATALOGS.weathers, entry]);

      expect(loadPresets(catalogs)).toMatchObject(
        err([{ code: "INVALID_PRESET", catalog: "weathers", index: 8, presetId: null, path: "" }]),
      );
    },
  );

  it("given an entry whose id is not a text when loading then the preset id is null", () => {
    const catalogs = withCatalog("weathers", [
      ...DEFAULT_CATALOGS.weathers,
      { id: 3, name: "garoa", temperature: 0, extraNoise: 0 },
    ]);

    expect(loadPresets(catalogs)).toMatchObject(
      err([{ catalog: "weathers", index: 8, presetId: null, path: "id" }]),
    );
  });

  it("given an unknown id when loading then the error points to the id field and keeps the id", () => {
    const drizzle = { id: "drizzle", name: "garoa", temperature: -500, extraNoise: 500 };

    expect(
      loadPresets(withCatalog("weathers", [...DEFAULT_CATALOGS.weathers, drizzle])),
    ).toMatchObject(
      err([
        { code: "INVALID_PRESET", catalog: "weathers", index: 8, presetId: "drizzle", path: "id" },
      ]),
    );
  });

  it("given an unknown field in a preset when loading then the error points to the field", () => {
    expect(loadPresets(patchPreset("places", "home", { lights: true }))).toStrictEqual(
      err([
        {
          code: "INVALID_PRESET",
          catalog: "places",
          index: 0,
          presetId: "home",
          path: "lights",
          message: 'Unrecognized key: "lights"',
        },
      ]),
    );
  });

  it("given a wrong value deep in a preset when loading then the error has the catalog, index, id and path", () => {
    const grid = { ...DEFAULT_CATALOGS.places[3]?.grid, exits: [{ x: 0, y: 0 }] };

    expect(loadPresets(patchPreset("places", "market", { grid }))).toStrictEqual(
      err([
        {
          code: "INVALID_PRESET",
          catalog: "places",
          index: 3,
          presetId: "market",
          path: "grid.exits.0",
          message: "not traversable: WALL",
        },
      ]),
    );
  });

  it("given problems in two catalogs when loading then both are reported in catalog order", () => {
    const catalogs = {
      ...patchPreset("tones", "WARM", { ambiguity: -1 }),
      emotions: [...DEFAULT_CATALOGS.emotions, { id: "awe" }],
    };

    expect(loadPresets(catalogs)).toMatchObject(
      err([
        { catalog: "emotions", index: 10, presetId: "awe", path: "id" },
        { catalog: "emotions", index: 10, presetId: "awe", path: "name" },
        { catalog: "tones", index: 0, presetId: "WARM", path: "ambiguity" },
      ]),
    );
  });
});

describe("preset ids (presets §1)", () => {
  it.each(CATALOG_NAMES)(
    "given the %s catalog when loading then its ids are its known ids, each once",
    (name) => {
      expect(idsOf(name)).toStrictEqual(CATALOG_IDS[name]);
      expect(new Set(idsOf(name)).size).toBe(idsOf(name).length);
    },
  );

  it("given a repeated id when loading then the error is DUPLICATE_ID naming the preset and its index", () => {
    expect(loadPresets(withRepeatedPreset("tones", "WARM"))).toStrictEqual(
      err([
        {
          code: "DUPLICATE_ID",
          catalog: "tones",
          index: 6,
          presetId: "WARM",
          path: "id",
          message: "the id WARM is already used at index 0",
        },
      ]),
    );
  });

  it("given a catalog without one of its ids when loading then the error is MISSING_ID naming the id", () => {
    expect(loadPresets(withoutPreset("emotions", "boredom"))).toStrictEqual(
      err([
        {
          code: "MISSING_ID",
          catalog: "emotions",
          index: null,
          presetId: "boredom",
          path: "",
          message: "no preset has the id boredom",
        },
      ]),
    );
  });

  it("given id problems in two catalogs when loading then all of them are reported", () => {
    const catalogs = {
      ...withoutPreset("emotions", "joy"),
      tones: withRepeatedPreset("tones", "NEUTRAL").tones,
    };

    expect(loadPresets(catalogs)).toMatchObject(
      err([
        { code: "MISSING_ID", catalog: "emotions", presetId: "joy" },
        { code: "DUPLICATE_ID", catalog: "tones", presetId: "NEUTRAL" },
      ]),
    );
  });
});
