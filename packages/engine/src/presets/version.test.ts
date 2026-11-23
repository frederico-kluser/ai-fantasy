import { describe, expect, it } from "vitest";

import { hashState } from "../session/hash.ts";
import { DEFAULT_CATALOGS } from "./catalogs.ts";
import { PRESETS_VERSION } from "./version.ts";

/**
 * The hash of the default catalogs of every released PRESETS_VERSION (presets
 * §11). Changing the data changes the hash: add a new version with its hash,
 * never edit an old line.
 */
const CATALOG_HASHES: Readonly<Record<string, string>> = {
  "0.1.0": "bacde45d3ff232c8",
};

describe("presets version (presets §1 and §11)", () => {
  it("given the presets version when reading then it is 0.1.0", () => {
    expect(PRESETS_VERSION).toBe("0.1.0");
  });

  it("given the default catalogs when hashing then the hash is the one recorded for PRESETS_VERSION", () => {
    expect(hashState(DEFAULT_CATALOGS)).toBe(CATALOG_HASHES[PRESETS_VERSION]);
  });
});
