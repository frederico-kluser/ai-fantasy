import { describe, expect, it } from "vitest";

import { aboutFact, aLabel, defaultRules } from "../../test/support/acts.ts";
import type { ActId } from "../presets/acts.ts";
import { actEntry, actTicks, toneEntry } from "./rules.ts";

const RULES = defaultRules();

describe("actTicks (dialogue-acts §2)", () => {
  it("given a CHAT when costing then it takes 3 ticks", () => {
    expect(actTicks(RULES, aLabel({ act: "CHAT" }))).toBe(3);
  });

  it("given a TELL of a SECRET when costing then it takes 6 ticks", () => {
    expect(actTicks(RULES, aLabel({ act: "TELL", topic: aboutFact("SECRET", 0) }))).toBe(6);
  });

  it("given a TELL of an EVENT when costing then it takes 3 ticks", () => {
    expect(actTicks(RULES, aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) }))).toBe(3);
  });

  it("given an ASK about a SECRET when costing then the secret cost does not apply: 2 ticks", () => {
    expect(actTicks(RULES, aLabel({ act: "ASK", topic: aboutFact("SECRET", 0) }))).toBe(2);
  });

  it.each<ActId>(["MOVE", "APPROACH", "WITHDRAW", "LEAVE", "FAREWELL"])(
    "given a %s when costing then it takes 1 tick (simulation-model §8.1)",
    (act) => {
      expect(actTicks(RULES, aLabel({ act, topic: { type: "NONE" } }))).toBe(1);
    },
  );
});

describe("catalog lookups", () => {
  it("given an act id when looking it up then the catalog entry comes back", () => {
    expect(actEntry(RULES, "ASK")).toMatchObject({ id: "ASK", createsObligation: true });
  });

  it("given a tone id when looking it up then the catalog entry comes back", () => {
    expect(toneEntry(RULES, "IRONIC")).toMatchObject({ id: "IRONIC", ambiguity: 2500 });
  });

  it("given rules without the act when looking it up then it is a programming error", () => {
    expect(() => actEntry({ acts: [], tones: [] }, "ASK")).toThrow(RangeError);
  });

  it("given rules without the tone when looking it up then it is a programming error", () => {
    expect(() => toneEntry({ acts: [], tones: [] }, "WARM")).toThrow(RangeError);
  });
});
