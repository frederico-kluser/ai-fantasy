import { describe, expect, it } from "vitest";

import { presets } from "../../test/fixtures.ts";
import {
  BOND_PAIRS_PER_CALL,
  buildBondCalls,
  buildCharacterCalls,
  buildSceneCall,
  CHARACTERS_PER_CALL,
} from "./premise.ts";
import { checkDecisionCall, type DecisionCall } from "./questions.ts";

const PREMISE = "Uma taverna de porto numa noite de tempestade.";

function lines(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `personagem ${index}`);
}

function sizes(calls: readonly DecisionCall[]): number[] {
  return calls.map((call) => Object.keys(call.questions).length);
}

function optionsOf(call: DecisionCall | undefined, id: string): string[] {
  return Object.keys((call?.questions[id] as { criteria: object }).criteria);
}

describe("buildSceneCall (presets §10 step 2)", () => {
  it("given no character lines when building the scene call then it has 6 questions", () => {
    const call = buildSceneCall({ premise: PREMISE, characterLines: [] }, presets());

    expect(Object.keys(call.questions)).toEqual([
      "place",
      "naturalTag",
      "weather",
      "dayPhase",
      "playerPresent",
      "characterCount",
    ]);
  });

  it("given character lines when building the scene call then the count question is left out", () => {
    const call = buildSceneCall({ premise: PREMISE, characterLines: lines(3) }, presets());

    expect(Object.keys(call.questions)).toHaveLength(5);
  });

  it("given the scene call when building then the place options are the 10 places and OTHER", () => {
    const call = buildSceneCall({ premise: PREMISE, characterLines: [] }, presets());

    expect(optionsOf(call, "place")).toHaveLength(11);
  });

  it("given the scene call when building then the count options go from 2 to 8", () => {
    const call = buildSceneCall({ premise: PREMISE, characterLines: [] }, presets());

    expect(optionsOf(call, "characterCount")).toEqual(["2", "3", "4", "5", "6", "7", "8"]);
  });

  it("given the scene call when building then the state is the premise and the lines", () => {
    const input = { premise: PREMISE, characterLines: ["eu sou Lia"], sessionId: "s" };

    const call = buildSceneCall(input, presets());

    expect([call.state, call.sessionId]).toEqual([
      { premise: PREMISE, characters: ["eu sou Lia"] },
      "s",
    ]);
  });

  it("given the scene call when building then it follows the route rules", () => {
    const call = buildSceneCall({ premise: PREMISE, characterLines: [] }, presets());

    expect(checkDecisionCall(call).ok).toBe(true);
  });
});

describe("buildCharacterCalls (presets §10 step 3)", () => {
  it("given 8 characters when building character questions then they go in 4 calls of 14 questions", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(8) }, presets());

    expect(sizes(calls)).toEqual([14, 14, 14, 14]);
  });

  it("given 3 characters when building character questions then they go in calls of 14 and 7", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(3) }, presets());

    expect(sizes(calls)).toEqual([14, 7]);
  });

  it("given a character when building then its 7 questions are prefixed by its index", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(3) }, presets());

    expect(Object.keys(calls[1]?.questions ?? {})).toEqual([
      "c2.archetype",
      "c2.ageBand",
      "c2.drive1",
      "c2.drive2",
      "c2.dayState",
      "c2.association",
      "c2.register",
    ]);
  });

  it("given a call when building then the state carries only its characters", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(3) }, presets());

    expect(calls[1]?.state).toEqual({
      premise: PREMISE,
      characters: [{ key: "c2", line: "personagem 2" }],
    });
  });

  it("given the association question then it offers fear and attachment of each tag and NONE", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(1) }, presets());

    expect(optionsOf(calls[0], "c0.association").slice(0, 2)).toEqual([
      "fear_forest",
      "attachment_forest",
    ]);
  });

  it("given the association question then it has 21 options", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(1) }, presets());

    expect(optionsOf(calls[0], "c0.association")).toHaveLength(21);
  });

  it("given the drive questions then each offers the 15 drives and NONE", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(1) }, presets());

    expect(optionsOf(calls[0], "c0.drive2")).toHaveLength(16);
  });

  it("given no character line when building then there is no call", () => {
    expect(buildCharacterCalls({ premise: PREMISE, characterLines: [] }, presets())).toEqual([]);
  });

  it("given character calls when building then each follows the route rules", () => {
    const calls = buildCharacterCalls({ premise: PREMISE, characterLines: lines(8) }, presets());

    expect(calls.map((call) => checkDecisionCall(call).ok)).toEqual([true, true, true, true]);
  });

  it("given the batch size when reading it then it is 2 characters per call", () => {
    expect(CHARACTERS_PER_CALL).toBe(2);
  });
});

describe("buildBondCalls (presets §10 step 4)", () => {
  it("given 4 characters when building bond questions then the 6 pairs go in calls of 15", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(4) }, presets());

    expect(sizes(calls)).toEqual([15, 15]);
  });

  it("given 3 characters when building bond questions then the 3 pairs go in one call", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(3) }, presets());

    expect(Object.keys(calls[0]?.questions ?? {}).slice(0, 5)).toEqual([
      "p0_1.bond",
      "p0_1.event1",
      "p0_1.event1By",
      "p0_1.event2",
      "p0_1.event2By",
    ]);
  });

  it("given 8 characters when building then the 28 pairs go in 10 calls", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(8) }, presets());

    expect(sizes(calls)).toEqual([15, 15, 15, 15, 15, 15, 15, 15, 15, 5]);
  });

  it("given the bond question then directional archetypes appear in both directions", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(2) }, presets());

    expect(optionsOf(calls[0], "p0_1.bond").slice(0, 3)).toEqual([
      "parent_child.ab",
      "parent_child.ba",
      "siblings",
    ]);
  });

  it("given the bond question then it has 23 options", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(2) }, presets());

    expect(optionsOf(calls[0], "p0_1.bond")).toHaveLength(23);
  });

  it("given the event questions then they offer the 21 events and NONE, and who did it", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(2) }, presets());

    expect([
      optionsOf(calls[0], "p0_1.event2").length,
      optionsOf(calls[0], "p0_1.event1By"),
    ]).toEqual([22, ["FIRST", "SECOND"]]);
  });

  it("given a call when building then the state carries its pairs with both lines", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(2) }, presets());

    expect(calls[0]?.state).toEqual({
      premise: PREMISE,
      pairs: [{ key: "p0_1", first: "personagem 0", second: "personagem 1" }],
    });
  });

  it("given bond calls when building then each follows the route rules", () => {
    const calls = buildBondCalls({ premise: PREMISE, characterLines: lines(4) }, presets());

    expect(calls.map((call) => checkDecisionCall(call).ok)).toEqual([true, true]);
  });

  it("given the batch size when reading it then it is 3 pairs per call", () => {
    expect(BOND_PAIRS_PER_CALL).toBe(3);
  });
});
