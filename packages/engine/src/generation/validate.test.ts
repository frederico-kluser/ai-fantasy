import { describe, expect, it } from "vitest";

import {
  aBondSpec,
  aCastCharacter,
  aCastInput,
  anEvent,
  defaultPresets,
  errorOf,
  valueOf,
} from "../../test/support/cast.ts";
import { validateCast } from "./validate.ts";

const presets = defaultPresets();

/** Axes of a locked bond side: every axis at 1000. */
const AXES = {
  trust: 1000,
  affection: 1000,
  respect: 1000,
  dependence: 1000,
  attraction: 1000,
  fearOf: 1000,
  resentment: 1000,
  closeness: 1000,
};

/** A possible locked character: traits 0, aptitudes 5000, two dominant weights. */
function aCharacterDraft(weights: Readonly<Record<string, number>>) {
  return {
    traits: {
      courage: 0,
      trustInOthers: 0,
      temper: 0,
      sociability: 0,
      selfControl: 0,
      empathy: 0,
      pride: 0,
      honesty: 0,
      humor: 0,
      romanticBoldness: 0,
    },
    aptitudes: { perceptiveness: 5000, eloquence: 5000, memory: 5000 },
    weights: {
      physical_relief: 3000,
      physical_safety: 3000,
      material_security: 3000,
      predictability: 3000,
      company: 3000,
      intimacy: 3000,
      desire: 3000,
      care: 3000,
      recognition: 3000,
      dignity: 3000,
      influence: 3000,
      curiosity: 3000,
      purpose: 3000,
      fun: 3000,
      justice: 3000,
      ...weights,
    },
    deficits: {
      material_security: 3000,
      predictability: 3000,
      company: 3000,
      recognition: 3000,
      dignity: 3000,
      influence: 3000,
      curiosity: 3000,
      purpose: 3000,
      fun: 3000,
    },
    associations: [],
  };
}

function codesOf(input: unknown): string[] {
  return errorOf(validateCast(presets, input)).map((error) => `${error.code} ${error.path}`);
}

describe("validateCast (presets §10.1)", () => {
  it("given a manual character with an unknown archetype when validating then it is rejected", () => {
    const input = { characters: [aCastCharacter("caretaker"), aCastCharacter("wizard")] };

    expect(codesOf(input)).toStrictEqual(["INVALID_INPUT characters.1.archetype"]);
  });

  it("given two spouse bonds for one character when validating then generation rejects the graph", () => {
    const input = aCastInput(
      ["elder", "caretaker", "seducer"],
      [aBondSpec(0, 1, "spouses"), aBondSpec(0, 2, "spouses")],
    );

    expect(codesOf(input)).toStrictEqual(["TOO_MANY_SPOUSES bonds.1"]);
  });

  it("given two partner bonds for one character when validating then the graph is rejected", () => {
    const input = aCastInput(
      ["seducer", "caretaker", "bohemian"],
      [aBondSpec(1, 0, "lovers"), aBondSpec(0, 2, "lovers")],
    );

    expect(codesOf(input)).toStrictEqual(["TOO_MANY_PARTNERS bonds.1"]);
  });

  it("given a character who is an ancestor of itself when validating then the parent cycle is rejected", () => {
    const input = aCastInput(
      ["elder", "caretaker", "child"],
      [
        aBondSpec(0, 1, "parent_child"),
        aBondSpec(1, 2, "parent_child"),
        aBondSpec(2, 0, "parent_child"),
      ],
    );

    expect(codesOf(input)).toStrictEqual(["PARENT_CYCLE bonds"]);
  });

  it("given a parent who is also the sibling and the grandparent of others when validating then each conflict names its pair", () => {
    const input = aCastInput(
      ["elder", "caretaker", "child"],
      [
        aBondSpec(0, 1, "parent_child"),
        aBondSpec(0, 2, "parent_child"),
        aBondSpec(1, 2, "parent_child"),
      ],
    );

    expect(codesOf(input)).toStrictEqual(["FAMILY_CONFLICT pair.0.2", "FAMILY_CONFLICT pair.1.2"]);
  });

  it.each([
    [aBondSpec(0, 5, "rivals"), "UNKNOWN_CHARACTER bonds.0"],
    [aBondSpec(1, 1, "rivals"), "SELF_BOND bonds.0"],
    [
      aBondSpec(0, 1, "rivals", { events: [anEvent("stole", 2)] }),
      "AUTHOR_OUTSIDE_PAIR bonds.0.events.0",
    ],
    [
      aBondSpec(0, 1, "strangers", { events: [anEvent("stole", 0)] }),
      "STRANGERS_WITH_EVENTS bonds.0",
    ],
  ])("given the bond %j when validating then the error is %s", (bond, expected) => {
    expect(codesOf(aCastInput(["rebel", "merchant", "devout"], [bond]))).toStrictEqual([expected]);
  });

  it("given two bonds on the same pair when validating then the second is rejected", () => {
    const input = aCastInput(
      ["rebel", "merchant"],
      [aBondSpec(0, 1, "rivals"), aBondSpec(1, 0, "colleagues")],
    );

    expect(codesOf(input)).toStrictEqual(["DUPLICATE_BOND bonds.1"]);
  });

  it.each([
    [[], "a locked bond without the mark of its event"],
    [[true], "a locked secret for an event that is never secret"],
  ])("given %j as secrets when validating then the locked bond is impossible (%s)", (secrets) => {
    const locked = { aToB: AXES, bToA: AXES, secrets };
    const bond = aBondSpec(0, 1, "old_friends", {
      events: [anEvent("helped_in_crisis", 0)],
      locked,
    });

    expect(codesOf(aCastInput(["rebel", "merchant"], [bond]))).toStrictEqual([
      "IMPOSSIBLE_DRAFT bonds.0.locked",
    ]);
  });

  it("given a locked character with one dominant weight when validating then the draft is rejected", () => {
    const character = aCastCharacter("merchant", { locked: aCharacterDraft({ fun: 8000 }) });

    expect(codesOf({ characters: [character] })).toStrictEqual([
      "INVALID_INPUT characters.0.locked.weights",
    ]);
  });

  it("given a locked character with two dominant weights when validating then it is kept", () => {
    const locked = aCharacterDraft({ fun: 8000, purpose: 7000 });
    const input = valueOf(
      validateCast(presets, { characters: [aCastCharacter("merchant", { locked })] }),
    );

    expect(input.characters[0]?.locked?.weights.fun).toBe(8000);
  });

  it("given a locked character with a repeated association tag when validating then the draft is rejected", () => {
    const association = { subject: { kind: "TAG", tag: "water" }, valence: -5000 };
    const locked = {
      ...aCharacterDraft({ fun: 8000, purpose: 7000 }),
      associations: [association, association],
    };

    expect(codesOf({ characters: [aCastCharacter("merchant", { locked })] })).toStrictEqual([
      "INVALID_INPUT characters.0.locked.associations.1",
    ]);
  });

  it("given a character with only the required fields when validating then the defaults are filled", () => {
    const input = valueOf(validateCast(presets, { characters: [aCastCharacter("scholar")] }));

    expect(input).toStrictEqual({
      attempt: 0,
      characters: [
        {
          archetype: "scholar",
          identity: {
            name: "scholar person",
            pronouns: "",
            description: "",
            role: "",
            ageBand: "ADULT",
            speechRegister: "COLLOQUIAL",
          },
          dominantDrives: [],
          dayState: "rested",
          association: null,
          locked: null,
        },
      ],
      bonds: [],
    });
  });

  it("given more than 8 characters when validating then the input is rejected", () => {
    const input = aCastInput(Array.from({ length: 9 }, () => "child"));

    expect(codesOf(input)).toStrictEqual(["INVALID_INPUT characters"]);
  });

  it("given three SOM picks for the dominant drives when validating then the input is rejected", () => {
    const character = aCastCharacter("child", { dominantDrives: ["fun", "care", "purpose"] });

    expect(codesOf({ characters: [character] })).toStrictEqual([
      "INVALID_INPUT characters.0.dominantDrives",
    ]);
  });
});
