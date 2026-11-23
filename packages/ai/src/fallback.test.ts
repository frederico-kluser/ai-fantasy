import { ACT_IDS, TONE_IDS } from "@ai-fantasy/engine";
import { describe, expect, it } from "vitest";

import { fallbackLine } from "./fallback.ts";
import { validateLine } from "./line.ts";
import { FALLBACK_LINES } from "./prompts/fallback-data.ts";

const COMBINATIONS = ACT_IDS.flatMap((act) => TONE_IDS.map((tone) => [act, tone] as const));
const TEMPLATES = Object.values(FALLBACK_LINES).flatMap((byTone) =>
  Object.values(byTone).flatMap((templates) => templates),
);

describe("fallbackLine (ai-integration §5.3)", () => {
  it("given every act and tone when asking for a fallback line then one exists", () => {
    const missing = COMBINATIONS.filter(([act, tone]) => fallbackLine(act, tone, 0).gesto === "");

    expect(missing).toEqual([]);
  });

  it("given the catalog when counting then there are 120 combinations with templates", () => {
    const counts = COMBINATIONS.map(([act, tone]) => FALLBACK_LINES[act][tone].length > 0);

    expect(counts.filter(Boolean)).toHaveLength(120);
  });

  it("given every template with a name when validating then it passes the line validation", () => {
    const rejected = TEMPLATES.filter(([fala, gesto]) => {
      const line = { fala: fala.replaceAll("{alvo}", "Otávio"), gesto };
      return !validateLine(line, ["Otávio"]).ok;
    });

    expect(rejected).toEqual([]);
  });

  it("given every template when checking the placeholder then it is only the vocative", () => {
    const misplaced = TEMPLATES.filter(([fala]) => fala.replaceAll(", {alvo}", "").includes("{"));

    expect(misplaced).toEqual([]);
  });

  it("given speech acts when asking then they speak; silent acts only gesture", () => {
    const speaking = ACT_IDS.filter((act) => fallbackLine(act, "NEUTRAL", 0).fala !== "");

    expect(speaking).toEqual(ACT_IDS.slice(0, 14));
  });

  it("given a target name when asking then it replaces the placeholder", () => {
    expect(fallbackLine("GREET", "NEUTRAL", 0, "Otávio")).toEqual({
      fala: "Bom dia, Otávio.",
      gesto: "acena com a cabeça",
    });
  });

  it("given no target name when asking then the vocative goes away", () => {
    expect(fallbackLine("GREET", "NEUTRAL", 0).fala).toBe("Bom dia.");
  });

  it.each([
    [0, "Que bom te ver!"],
    [1, "Olá! Como você está?"],
    [2, "Que bom te ver!"],
    [-1, "Olá! Como você está?"],
  ])("given the index %s when asking then the choice wraps deterministically", (index, fala) => {
    expect(fallbackLine("GREET", "WARM", index).fala).toBe(fala);
  });

  it.each([[0.5], [Number.NaN]])("given the index %s when asking then it throws", (index) => {
    expect(() => fallbackLine("GREET", "WARM", index)).toThrow(RangeError);
  });
});
