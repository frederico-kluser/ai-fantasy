import { describe, expect, it } from "vitest";

import { fnv1a32, fnv1a64 } from "./fnv.ts";

describe("FNV-1a hashes (simulation-model §15)", () => {
  it("given the reference strings when hashing with FNV-1a 32 and 64 then the results match the published vectors", () => {
    // IETF draft-eastlake-fnv-21, Appendix C, Table 3 (strings without a null terminator).
    const strings = ["", "a", "foobar"];

    expect(strings.map((text) => fnv1a32(text))).toStrictEqual([
      0x811c9dc5, 0xe40c292c, 0xbf9cf968,
    ]);
    expect(strings.map((text) => fnv1a64(text))).toStrictEqual([
      "cbf29ce484222325",
      "af63dc4c8601ec8c",
      "85944171f73967e8",
    ]);
  });

  it("given non-ASCII texts when hashing then the results match the independent reference", () => {
    // Computed by a throwaway Python reference over Python's own UTF-8 encoder.
    expect([fnv1a32("ação"), fnv1a64("ação")]).toStrictEqual([0x0b2cde09, "74b2e70b31a1c349"]);
    expect([fnv1a32("Olá, 世界 🎲"), fnv1a64("Olá, 世界 🎲")]).toStrictEqual([
      0x39bd4c59,
      "1e36e350be8361d9",
    ]);
  });

  it("given a 64-bit hash below 2^60 when formatting then it keeps 16 hexadecimal digits", () => {
    expect(fnv1a64("k0")).toBe("08be0e07b562230e");
  });
});
