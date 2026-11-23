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
import { hasTension, TENSION_EVENTS } from "./tension.ts";

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
    expect(victimBond?.axes).toStrictEqual(cast.drafts.bonds[0]?.draft.bToA);
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
    const drawn = cast.drafts.bonds[0]?.draft.bToA;

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
    const locked = { ...rivals, locked: first.drafts.bonds[0]?.draft };
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

  it("given ten cast seeds when generating then characters draw 0, 1 or 2 associations with distinct tags", () => {
    const drafts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(
      (castSeed) => castOf(FAMILY, { castSeed, sceneSeed: 0 }).drafts.characters,
    );
    const tags = drafts.map((draft) => draft.associations.map((a) => a.subject.tag));

    expect(new Set(tags.map((list) => list.length))).toStrictEqual(new Set([0, 1, 2]));
    expect(tags.every((list) => new Set(list).size === list.length)).toBe(true);
  });

  it("given an archetype that does not cite a trait when generating then it is drawn in -2000..2000", () => {
    const courage = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (castSeed) =>
        castOf({ characters: [aCastCharacter("caretaker")] }, { castSeed, sceneSeed: 0 }).drafts
          .characters[0]?.traits.courage ?? 0,
    );

    expect(courage.every((value) => value >= -2000 && value <= 2000)).toBe(true);
  });

  it("given an attachment chosen by the SOM when generating then it comes first with valence 5000", () => {
    const character = aCastCharacter("child", { association: { tag: "fire", kind: "ATTACHMENT" } });

    expect(castOf({ characters: [character] }).characters[0]?.associations[0]?.valence).toBe(5000);
  });

  it("given events that are never, always and sometimes secret when generating then only the last draws its secret", () => {
    const bonds = [
      aBondSpec(0, 1, "colleagues", {
        events: [anEvent("helped_in_crisis", 0), anEvent("stole", 1)],
      }),
      aBondSpec(0, 2, "colleagues", { events: [anEvent("betrayed_trust", 2)] }),
    ];
    const generated = valueOf(
      generateCast(presets, aCastInput(["rebel", "merchant", "elder"], bonds), SEEDS),
    );
    const secrets = generated.records.filter((record) => record.purpose === "HISTORY_SECRET");

    expect(secrets.map((record) => [record.target, record.p])).toStrictEqual([[2, 5000]]);
    expect(generated.cast.facts.map((fact) => fact.secret)).toStrictEqual([
      false,
      true,
      secrets[0]?.outcome === 1,
    ]);
  });

  it.each([
    [1, 1000],
    [0, 0],
  ])(
    "given a thief with honesty %i when generating then the guilt shift is %i",
    (honesty, guilt) => {
      const first = castOf(aCastInput(["proud_worker", "merchant"]));
      const draft = first.drafts.characters[0];
      const locked = { ...draft, traits: { ...draft?.traits, honesty } };
      const bond = aBondSpec(0, 1, "colleagues", { events: [anEvent("stole", 0)] });
      const cast = castOf({
        characters: [aCastCharacter("proud_worker", { locked }), aCastCharacter("merchant")],
        bonds: [bond],
      });

      expect(characterOf(cast.characters, 0).baselineShifts.guilt).toBe(guilt);
    },
  );

  it("given a generated character before the scene opens then it stands at cell 0 at rest, at its baselines, with no tendency, perception or threat", () => {
    const character = characterOf(castOf(FAMILY).characters, 1);

    expect([character.cell, character.perceptions, character.threat]).toStrictEqual([0, [], 0]);
    expect(character.emotions).toStrictEqual(character.baselines);
    expect(Object.values(character.body)).toStrictEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(new Set(Object.values(character.tendencies))).toStrictEqual(new Set([0]));
  });

  it("given a generated character when reading its drives then the undirected deficits hold the eleven undirected drives with relief and safety at 0", () => {
    const deficits = characterOf(castOf(FAMILY).characters, 0).drives.deficits;

    expect(Object.keys(deficits)).toStrictEqual([
      "physical_relief",
      "physical_safety",
      "material_security",
      "predictability",
      "company",
      "recognition",
      "dignity",
      "influence",
      "curiosity",
      "purpose",
      "fun",
    ]);
    expect([deficits.physical_relief, deficits.physical_safety]).toStrictEqual([0, 0]);
  });

  it("given justice from a bond toward one and from an event toward another when generating then both entries are sorted by target", () => {
    const bonds = [
      aBondSpec(0, 1, "colleagues", { events: [anEvent("public_humiliation", 1)] }),
      aBondSpec(0, 2, "enemies"),
    ];
    const cast = castOf(aCastInput(["rebel", "merchant", "elder"], bonds));

    expect(characterOf(cast.characters, 0).drives.directed.justice).toStrictEqual([
      { target: 1, deficit: 5500 },
      { target: 2, deficit: 3000 },
    ]);
  });

  it("given a grandparent without a chosen bond when generating then the grandparent is side A of the parent_child values", () => {
    const characters = castOf(FAMILY).characters;
    const towardGrandparent = characterOf(characters, 2).bonds.find((bond) => bond.target === 0);
    const towardGrandchild = characterOf(characters, 0).bonds.find((bond) => bond.target === 2);

    expect(towardGrandparent?.axes.dependence).toBeGreaterThanOrEqual(5000);
    expect(towardGrandchild?.axes.dependence).toBeLessThanOrEqual(500);
    expect(
      characterOf(characters, 0).drives.directed.care.map((entry) => entry.target),
    ).toStrictEqual([1, 2, 3]);
  });

  it("given a family when generating then every character has one bond per known person and none toward itself", () => {
    const characters = castOf(FAMILY).characters;

    expect(characters.map((character) => character.bonds.map((bond) => bond.target))).toStrictEqual(
      [
        [1, 2, 3],
        [0, 2, 3],
        [0, 1, 3],
        [0, 1, 2],
      ],
    );
  });

  it("given bonds written out of pair order when generating then the draws follow pair order and the drafts the input order", () => {
    const bonds = [aBondSpec(0, 2, "colleagues"), aBondSpec(0, 1, "colleagues")];
    const generated = valueOf(
      generateCast(presets, aCastInput(["rebel", "merchant", "elder"], bonds), SEEDS),
    );
    const axisTargets = generated.records
      .filter((record) => record.purpose === "BOND_AXIS")
      .map((record) => record.target);
    const eight = (id: number) => Array.from({ length: 8 }, () => id);

    expect(axisTargets).toStrictEqual([...eight(0), ...eight(1), ...eight(0), ...eight(2)]);
    expect(characterOf(generated.cast.characters, 0).bonds[1]?.axes).toStrictEqual(
      generated.cast.drafts.bonds[0]?.draft.aToB,
    );
  });

  it("given an archetype that cites a trait when generating then it is drawn within 1500 of the cited value", () => {
    const empathy = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (castSeed) =>
        castOf({ characters: [aCastCharacter("caretaker")] }, { castSeed, sceneSeed: 0 }).drafts
          .characters[0]?.traits.empathy ?? 0,
    );

    expect(empathy.every((value) => value >= 5500 && value <= 8500)).toBe(true);
    expect(empathy.some((value) => value !== 7000)).toBe(true);
  });

  it("given an event with one person when generating then its bond deltas do not touch the bond with another", () => {
    const bonds = [
      aBondSpec(0, 1, "enemies", { events: [anEvent("helped_in_crisis", 0)] }),
      aBondSpec(0, 2, "enemies"),
    ];
    const cast = castOf(aCastInput(["rebel", "merchant", "elder"], bonds));
    const bondsOfFirst = characterOf(cast.characters, 0).bonds;

    expect(bondsOfFirst[1]?.axes).toStrictEqual(cast.drafts.bonds[1]?.draft.aToB);
    expect(bondsOfFirst[0]?.axes.affection).toBe(
      (cast.drafts.bonds[0]?.draft.aToB.affection ?? 0) + 1000,
    );
  });

  it("given a loan never repaid when generating then the debtor's guilt and shame each shift 500 and nothing else", () => {
    const bond = aBondSpec(0, 1, "enemies", { events: [anEvent("lent_not_repaid", 0)] });
    const cast = castOf(aCastInput(["merchant", "trickster"], [bond]));

    expect(characterOf(cast.characters, 1).baselineShifts).toStrictEqual({
      joy: 0,
      sadness: 0,
      fear: 0,
      anger: 0,
      disgust: 0,
      surprise: 0,
      shame: 500,
      guilt: 500,
      jealousy: 0,
      boredom: 0,
    });
  });

  it("given a spouse and a rival for the same character when generating then the graph is valid", () => {
    const bonds = [aBondSpec(0, 1, "spouses"), aBondSpec(0, 2, "rivals")];
    const cast = castOf(aCastInput(["elder", "caretaker", "rebel"], bonds));

    expect(labelsOf(cast.characters, 0, 1)).toStrictEqual(["SPOUSE"]);
  });

  it("given a grandparent with a higher id than the grandchild when generating then the grandparent is side A of the derived pair", () => {
    const bonds = [aBondSpec(2, 1, "parent_child"), aBondSpec(1, 0, "parent_child")];
    const cast = castOf(aCastInput(["child", "caretaker", "elder"], bonds));
    const towardGrandparent = characterOf(cast.characters, 0).bonds.find(
      (bond) => bond.target === 2,
    );

    expect([labelsOf(cast.characters, 2, 0), labelsOf(cast.characters, 0, 2)]).toStrictEqual([
      ["GRANDPARENT"],
      ["GRANDCHILD"],
    ]);
    expect(towardGrandparent?.axes.dependence).toBeGreaterThanOrEqual(5000);
    expect(cast.drafts.bonds.map((entry) => [entry.a, entry.b, entry.derived])).toStrictEqual([
      [2, 1, false],
      [1, 0, false],
      [2, 0, true],
    ]);
  });

  it("given a chosen bond between two siblings when generating then the pair keeps a single bond", () => {
    const bonds = [
      aBondSpec(0, 1, "parent_child"),
      aBondSpec(0, 2, "parent_child"),
      aBondSpec(1, 2, "rivals"),
    ];
    const cast = castOf(aCastInput(["elder", "rebel", "trickster"], bonds));

    expect(characterOf(cast.characters, 2).bonds.map((bond) => bond.target)).toStrictEqual([0, 1]);
    expect(cast.drafts.bonds.map((entry) => entry.derived)).toStrictEqual([false, false, false]);
  });

  it("given a family when generating then the drafts list the chosen bonds in input order and then the derived pairs in pair order", () => {
    expect(
      castOf(FAMILY).drafts.bonds.map((entry) => [entry.a, entry.b, entry.derived]),
    ).toStrictEqual([
      [0, 1, false],
      [1, 2, false],
      [1, 3, false],
      [0, 2, true],
      [0, 3, true],
      [2, 3, true],
    ]);
  });

  it("given a locked derived pair when regenerating with the next attempt counter then it is unchanged and the other derived pairs may change", () => {
    const first = castOf(FAMILY);
    const siblings = first.drafts.bonds[5];
    const again = castOf({
      ...FAMILY,
      attempt: 1,
      derived: [{ a: 2, b: 3, locked: siblings?.draft }],
    });

    expect(again.drafts.bonds[5]).toStrictEqual(siblings);
    expect(again.drafts.bonds[3]).not.toStrictEqual(first.drafts.bonds[3]);
  });

  it("given acquaintances without tension for any cast seed when generating then the hook leaves the pair with tension", () => {
    const input = aCastInput(["merchant", "scholar"], [aBondSpec(0, 1, "acquaintances")]);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4294967295 }), (castSeed) => {
        const cast = castOf(input, { castSeed, sceneSeed: 0 });
        const [x, y] = [characterOf(cast.characters, 0), characterOf(cast.characters, 1)];

        expect(cast.hook).not.toBeNull();
        expect(hasTension(x, y, cast.facts)).toBe(true);
      }),
      { numRuns: 60 },
    );
  });

  it("given two locked derived pairs when regenerating then each keeps its own draft and the third is drawn again", () => {
    const first = castOf(FAMILY);
    const [grand, , siblings] = [
      first.drafts.bonds[3],
      first.drafts.bonds[4],
      first.drafts.bonds[5],
    ];
    const derived = [
      { a: 0, b: 2, locked: grand?.draft },
      { a: 2, b: 3, locked: siblings?.draft },
    ];
    const again = castOf({ ...FAMILY, attempt: 1, derived });

    expect([again.drafts.bonds[3], again.drafts.bonds[5]]).toStrictEqual([grand, siblings]);
    expect(again.drafts.bonds[4]?.draft).not.toStrictEqual(grand?.draft);
    expect(again.drafts.bonds[4]?.draft).not.toStrictEqual(siblings?.draft);
  });
});
