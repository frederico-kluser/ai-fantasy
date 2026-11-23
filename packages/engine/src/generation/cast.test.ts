import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { dominantDrives } from "../character/drives.ts";
import { emotionBaselines } from "../character/emotions.ts";
import type { CharacterId } from "../domain/ids.ts";
import { hashState } from "../session/hash.ts";
import { rangeProblems } from "../../test/support/character.ts";
import {
  aBondSpec,
  aCastCharacter,
  aCastInput,
  anEvent,
  characterOf,
  defaultPresets,
  errorOf,
  holdersOf,
  labelsOf,
  valueOf,
} from "../../test/support/cast.ts";
import { generateCast } from "./cast.ts";
import { TENSION_EVENTS } from "./tension.ts";

const presets = defaultPresets();
const SEEDS = { castSeed: 20261123, sceneSeed: 1 };

function castOf(input: unknown, seeds = SEEDS) {
  return valueOf(generateCast(presets, input, seeds)).cast;
}

const FAMILY = aCastInput(
  ["elder", "caretaker", "child", "rebel"],
  [
    aBondSpec(0, 1, "parent_child"),
    aBondSpec(1, 2, "parent_child"),
    aBondSpec(1, 3, "parent_child"),
  ],
);

describe("generateCast (presets §10.1)", () => {
  it("given the same cast seed when generating twice then the casts are identical", () => {
    const first = valueOf(generateCast(presets, FAMILY, SEEDS));
    const second = valueOf(generateCast(presets, FAMILY, SEEDS));

    expect(second).toStrictEqual(first);
    expect(hashState(second.cast.characters)).toBe(hashState(first.cast.characters));
  });

  it("given another scene seed when generating then the cast is the same and only generation was drawn", () => {
    const first = valueOf(generateCast(presets, FAMILY, SEEDS));
    const other = valueOf(generateCast(presets, FAMILY, { ...SEEDS, sceneSeed: 99 }));

    expect(other.cast).toStrictEqual(first.cast);
    expect(new Set(first.records.map((record) => record.stream))).toStrictEqual(
      new Set(["generation"]),
    );
  });

  it("given another cast seed when generating then the drawn values change", () => {
    const first = castOf(FAMILY);
    const other = castOf(FAMILY, { ...SEEDS, castSeed: 5 });

    expect(other.drafts).not.toStrictEqual(first.drafts);
  });

  it("given an invalid input when generating then the errors come back and nothing is drawn", () => {
    const input = aCastInput(["elder", "wizard"]);

    expect(errorOf(generateCast(presets, input, SEEDS)).map((error) => error.code)).toStrictEqual([
      "INVALID_INPUT",
    ]);
  });

  it("given a parent_child bond with the second as parent when generating then the first holds the CHILD label", () => {
    const cast = castOf(aCastInput(["child", "elder"], [aBondSpec(1, 0, "parent_child")]));

    expect([labelsOf(cast.characters, 0, 1), labelsOf(cast.characters, 1, 0)]).toStrictEqual([
      ["CHILD"],
      ["PARENT"],
    ]);
  });

  it("given two children of the same parent when generating then they become siblings", () => {
    const cast = castOf(FAMILY);

    expect([labelsOf(cast.characters, 2, 3), labelsOf(cast.characters, 3, 2)]).toStrictEqual([
      ["SIBLING"],
      ["SIBLING"],
    ]);
  });

  it("given siblings without a chosen bond when generating then their bond is drawn from the siblings archetype", () => {
    const axes = characterOf(castOf(FAMILY).characters, 2).bonds.find(
      (bond) => bond.target === 3,
    )?.axes;

    expect(axes?.affection).toBeGreaterThanOrEqual(5000);
    expect(axes?.affection).toBeLessThanOrEqual(7000);
    expect(axes?.closeness).toBeGreaterThanOrEqual(7000);
  });

  it("given a parent of a parent when generating then grandparent and grandchild labels join them", () => {
    const cast = castOf(FAMILY);

    expect([labelsOf(cast.characters, 0, 2), labelsOf(cast.characters, 2, 0)]).toStrictEqual([
      ["GRANDPARENT"],
      ["GRANDCHILD"],
    ]);
  });

  it("given a chosen bond between two children of the same parent when generating then SIBLING joins its labels", () => {
    const input = aCastInput(
      ["elder", "rebel", "trickster"],
      [aBondSpec(0, 1, "parent_child"), aBondSpec(0, 2, "parent_child"), aBondSpec(1, 2, "rivals")],
    );

    expect(labelsOf(castOf(input).characters, 2, 1)).toStrictEqual(["SIBLING", "RIVAL"]);
  });

  it("given SOM picks for two dominant drives when generating then the dominants are those picks followed by the archetype's, up to 3", () => {
    const character = aCastCharacter("caretaker", { dominantDrives: ["fun", "care"] });
    const cast = castOf({ characters: [character] });

    expect(dominantDrives(characterOf(cast.characters, 0).drives)).toStrictEqual([
      "intimacy",
      "care",
      "fun",
    ]);
  });

  it("given acquaintances without tension when generating then a tension event is added to the pair with the lowest ids", () => {
    const input = aCastInput(
      ["merchant", "scholar", "devout"],
      [aBondSpec(2, 1, "acquaintances"), aBondSpec(2, 0, "acquaintances")],
    );
    const cast = castOf(input);
    const hook = cast.hook;

    expect([hook?.author, hook?.subject].sort()).toStrictEqual([0, 2]);
    expect(TENSION_EVENTS).toContain(hook?.event);
    expect(cast.facts.map((fact) => [fact.id, fact.event])).toStrictEqual([[0, hook?.event]]);
  });

  it("given a bond with tension when generating then no hook is added", () => {
    const cast = castOf(aCastInput(["merchant", "scholar"], [aBondSpec(0, 1, "enemies")]));

    expect([cast.hook, cast.facts]).toStrictEqual([null, []]);
  });

  it("given only strangers when generating then no hook is added", () => {
    const cast = castOf(aCastInput(["merchant", "scholar"], [aBondSpec(0, 1, "strangers")]));

    expect(cast.hook).toBeNull();
  });

  it("given a stole event when generating then only its author holds a copy and the victim's effects wait until the victim learns it", () => {
    const bond = aBondSpec(0, 1, "colleagues", { events: [anEvent("stole", 0)] });
    const cast = castOf(aCastInput(["trickster", "proud_worker"], [bond]));
    const victimBond = characterOf(cast.characters, 1).bonds[0];

    expect(cast.facts).toStrictEqual([
      {
        id: 0,
        kind: "HISTORY",
        event: "stole",
        author: 0,
        subject: 1,
        offenders: [0],
        secret: true,
      },
    ]);
    expect(holdersOf(cast.characters, 0)).toStrictEqual([0]);
    expect(victimBond?.axes).toStrictEqual(cast.drafts.bonds[0]?.bToA);
  });

  it("given a shared_secret event when generating then both hold DIRECT copies with fidelity 8000 and no one else does", () => {
    const bond = aBondSpec(0, 1, "old_friends", { events: [anEvent("shared_secret", 1)] });
    const cast = castOf(aCastInput(["bohemian", "scholar", "devout"], [bond]));
    const copies = [0, 1].map((id) => characterOf(cast.characters, id).memories[0]);

    expect(holdersOf(cast.characters, 0)).toStrictEqual([0, 1]);
    expect(copies.map((copy) => [copy?.perspective, copy?.fidelity])).toStrictEqual([
      ["DIRECT", 8000],
      ["DIRECT", 8000],
    ]);
  });

  it("given a shared_secret event when generating then the copy importance follows simulation-model §12", () => {
    const bond = aBondSpec(0, 1, "old_friends", { events: [anEvent("shared_secret", 0)] });
    const cast = castOf(aCastInput(["bohemian", "scholar"], [bond]));

    // A: closeness +2000 → 2 × 2000 + 3000; B: trust and closeness +2000 → 2 × 4000 + 3000.
    expect(
      [0, 1].map((id) => characterOf(cast.characters, id).memories[0]?.importance),
    ).toStrictEqual([7000, 10000]);
  });

  it("given a known event when generating then the bond deltas add to the drawn axes", () => {
    const bond = aBondSpec(0, 1, "colleagues", { events: [anEvent("saved_life", 0)] });
    const cast = castOf(aCastInput(["protector", "child"], [bond]));
    const drawn = cast.drafts.bonds[0]?.bToA;

    expect(characterOf(cast.characters, 1).bonds[0]?.axes.trust).toBe((drawn?.trust ?? 0) + 3000);
  });

  it("given a parent_child bond when generating then the parent's care toward the child starts at 3000 and nobody else has an entry", () => {
    const cast = castOf(
      aCastInput(["caretaker", "child", "elder"], [aBondSpec(0, 1, "parent_child")]),
    );

    expect(characterOf(cast.characters, 0).drives.directed.care).toStrictEqual([
      { target: 1, deficit: 3000 },
    ]);
    expect(characterOf(cast.characters, 1).drives.directed.care).toStrictEqual([]);
  });

  it("given a public humiliation when generating then the victim's justice toward the author is 3000 plus 2500 and dignity rises 3000", () => {
    const bond = aBondSpec(0, 1, "colleagues", { events: [anEvent("public_humiliation", 0)] });
    const cast = castOf(aCastInput(["authoritarian", "shy_observer"], [bond]));
    const victim = characterOf(cast.characters, 1);

    expect(victim.drives.directed.justice).toStrictEqual([{ target: 0, deficit: 5500 }]);
    expect(victim.drives.deficits.dignity).toBe(
      (cast.drafts.characters[1]?.deficits.dignity ?? 0) + 3000,
    );
  });

  it("given a shared grief when generating then both keep the sadness shift and their baselines include it", () => {
    const bond = aBondSpec(0, 1, "siblings", { events: [anEvent("shared_grief", 1)] });
    const cast = castOf(aCastInput(["elder", "caretaker"], [bond]));
    const elder = characterOf(cast.characters, 0);

    expect([
      elder.baselineShifts.sadness,
      characterOf(cast.characters, 1).baselineShifts.sadness,
    ]).toStrictEqual([500, 500]);
    expect(elder.baselines).toStrictEqual(emotionBaselines(elder.traits, elder.baselineShifts));
  });

  it("given a locked bond when regenerating with the next attempt counter then the locked bond is unchanged and the others may change", () => {
    const rivals = aBondSpec(0, 1, "rivals");
    const friends = aBondSpec(1, 2, "old_friends");
    const first = castOf(aCastInput(["rebel", "merchant", "devout"], [rivals, friends]));
    const locked = { ...rivals, locked: first.drafts.bonds[0] };
    const again = castOf(
      aCastInput(["rebel", "merchant", "devout"], [locked, friends], { attempt: 1 }),
    );

    expect(again.drafts.bonds[0]).toStrictEqual(first.drafts.bonds[0]);
    expect(characterOf(again.characters, 0).bonds).toStrictEqual(
      characterOf(first.characters, 0).bonds,
    );
    expect(again.drafts.bonds[1]).not.toStrictEqual(first.drafts.bonds[1]);
  });

  it("given a locked character when regenerating with the next attempt counter then its values are unchanged", () => {
    const first = castOf(aCastInput(["rebel", "merchant"]));
    const characters = [
      aCastCharacter("rebel", { locked: first.drafts.characters[0] }),
      aCastCharacter("merchant"),
    ];
    const again = castOf({ attempt: 1, characters });

    expect(again.drafts.characters[0]).toStrictEqual(first.drafts.characters[0]);
    expect(again.drafts.characters[1]).not.toStrictEqual(first.drafts.characters[1]);
  });

  it("given a SOM association when generating then it comes first with valence −6000", () => {
    const character = aCastCharacter("child", { association: { tag: "water", kind: "FEAR" } });

    expect(
      characterOf(castOf({ characters: [character] }).characters, 0).associations[0],
    ).toStrictEqual({
      subject: { kind: "TAG", tag: "water" },
      valence: -6000,
    });
  });

  it("given the identities of the input when generating then they are kept for presentation with the archetype", () => {
    const character = aCastCharacter("elder", {
      identity: { name: "Ana", role: "avó" },
      dayState: "tired",
    });
    const cast = castOf({ characters: [character] });

    expect([cast.identities, cast.dayStates]).toStrictEqual([
      [
        {
          id: 0 as CharacterId,
          archetype: "elder",
          name: "Ana",
          pronouns: "",
          description: "",
          role: "avó",
          ageBand: "ADULT",
          speechRegister: "COLLOQUIAL",
        },
      ],
      ["tired"],
    ]);
  });

  it("given any cast seed when generating then every value is in its scale and every character has 2 or 3 dominants", () => {
    const input = aCastInput(
      ["caretaker", "seducer", "rebel", "bitter_loner"],
      [
        aBondSpec(0, 1, "spouses", { events: [anEvent("betrayed_trust", 1)] }),
        aBondSpec(2, 3, "enemies", { events: [anEvent("violent_fight", 2)] }),
        aBondSpec(1, 2, "unrequited_love"),
      ],
    );
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4294967295 }), (castSeed) => {
        const cast = castOf(input, { castSeed, sceneSeed: 0 });
        const dominants = cast.characters.map(
          (character) => dominantDrives(character.drives).length,
        );

        expect(cast.characters.flatMap(rangeProblems)).toStrictEqual([]);
        expect(dominants.every((count) => count >= 2 && count <= 3)).toBe(true);
      }),
      { numRuns: 50 },
    );
  });
});
