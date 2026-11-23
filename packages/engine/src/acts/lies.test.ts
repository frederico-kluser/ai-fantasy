import { describe, expect, it } from "vitest";

import { aboutFact, aDrawer, aLabel, factIdOf, forcing, ids } from "../../test/support/acts.ts";
import { aBond, aCharacter, aPerception, someTraits } from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import { createCopy } from "../memory/copy.ts";
import type { SignalPerceived } from "../signals/perceive.ts";
import { applyDeltas, finalizeDeltas, type StateDelta } from "./deltas.ts";
import {
  beliefChance,
  detectionChance,
  discoveredLieDeltas,
  drawLieOutcomes,
  factLie,
  lieDiscoveries,
  lieOutcomeDeltas,
  withLieImportance,
} from "./lies.ts";

const [liar, two, three, four] = ids(1, 2, 3, 4) as [
  CharacterId,
  CharacterId,
  CharacterId,
  CharacterId,
];
const FACT = factIdOf(0);

const author = aCharacter(1, 0, {
  aptitudes: { perceptiveness: toBp(5000), eloquence: toBp(6000), memory: toBp(5000) },
});

function withCopy(
  id: number,
  fidelity: number,
  falseOffenders: readonly CharacterId[] | null = null,
) {
  const copy = createCopy(FACT, { perspective: "DIRECT" }, toBp(3000), falseOffenders);
  return aCharacter(id, 0, { memories: [{ ...copy, fidelity: toBp(fidelity) }] });
}

describe("lie chances (dialogue-acts §5)", () => {
  it("given a sharp hearer and an eloquent liar when computing the detection chance then it is 4000 + perceptiveness / 2 - eloquence / 4", () => {
    expect(detectionChance(toBp(6000), toBp(6000))).toBe(4000 + 3000 - 1500);
  });

  it.each([
    [0, 10000, 1500],
    [10000, 0, 9000],
  ])(
    "given perceptiveness %i and eloquence %i when computing the detection chance then it is %i",
    (sharp, smooth, chance) => {
      expect(detectionChance(toBp(sharp), toBp(smooth))).toBe(chance);
    },
  );

  it.each([
    [10000, 10000, 9500],
    [0, 0, 500],
    [3000, 6000, 4500],
  ])(
    "given trust %i and sincerity %i when computing the belief chance then it is %i",
    (trust, sincerity, chance) => {
      expect(beliefChance(toBp(trust), toBp(sincerity))).toBe(chance);
    },
  );
});

describe("factLie (dialogue-acts §5)", () => {
  it.each([
    [aLabel({ act: "TELL", topic: aboutFact("EVENT", 0), isFalse: true }), null, 0],
    [aLabel({ act: "TELL", topic: aboutFact("RUMOR", 0), isFalse: false }), null, null],
    [aLabel({ act: "TELL", topic: { type: "SMALL_TALK" }, isFalse: true }), null, null],
    [aLabel({ act: "REFUSE", topic: aboutFact("EVENT", 0), isFalse: true }), "ACCUSE", 0],
    [aLabel({ act: "REFUSE", topic: aboutFact("EVENT", 0), isFalse: true }), "ASK", null],
    [aLabel({ act: "APOLOGIZE", topic: aboutFact("EVENT", 0), isFalse: true }), null, null],
  ] as const)(
    "given %j answering %s when finding the fact of the lie then it is %s",
    (label, answered, fact) => {
      expect(factLie(label, answered)).toBe(fact);
    },
  );
});

describe("drawLieOutcomes (dialogue-acts §5)", () => {
  it("given hearers out of id order when drawing then each is settled in id order with the right stream and purpose", () => {
    const drawer = aDrawer([forcing("LIE_DETECT", 1, 3), forcing("LIE_BELIEF", 1, 2)]);
    const hearers = [withCopy(3, 5000), aCharacter(2, 0)];

    const outcomes = drawLieOutcomes(drawer, { author, fact: FACT, hearers });
    const records = drawer.finish().records;

    expect(outcomes).toEqual([
      { listener: two, kind: "BELIEVED" },
      { listener: three, kind: "DETECTED" },
    ]);
    expect(
      records.map((record) => [record.stream, record.purpose, record.target, record.p]),
    ).toEqual([
      ["resolution", "LIE_BELIEF", 2, 2500],
      ["perception", "LIE_DETECT", 3, detectionChance(toBp(5000), toBp(6000))],
    ]);
  });

  it("given a hearer who misses the lie when drawing then it keeps its own copy", () => {
    const drawer = aDrawer([forcing("LIE_DETECT", 0, 3)]);

    expect(drawLieOutcomes(drawer, { author, fact: FACT, hearers: [withCopy(3, 9000)] })).toEqual([
      { listener: three, kind: "KEPT" },
    ]);
  });

  it.each([
    ["a copy below fidelity 5000", withCopy(3, 4999)],
    ["a false copy", withCopy(3, 10000, [])],
  ])("given a hearer with %s when drawing then it keeps it without a draw", (_case, hearer) => {
    const drawer = aDrawer();

    expect(drawLieOutcomes(drawer, { author, fact: FACT, hearers: [hearer] })).toEqual([
      { listener: three, kind: "KEPT" },
    ]);
    expect(drawer.finish().records).toEqual([]);
  });

  it("given a hearer without a copy who doubts when drawing then the belief chance reads its trust and perceived sincerity", () => {
    const drawer = aDrawer([forcing("LIE_BELIEF", 0, 4)]);
    const hearer = aCharacter(4, 0, {
      bonds: [aBond(1, { trust: 3000 })],
      perceptions: [aPerception(1, { perceivedSincerity: 6000 })],
    });

    const outcomes = drawLieOutcomes(drawer, { author, fact: FACT, hearers: [hearer] });

    expect(outcomes).toEqual([{ listener: four, kind: "DOUBTED" }]);
    expect(drawer.finish().records[0]?.p).toBe(4500);
  });

  it("given a hearer without a record of the liar when drawing then the sincerity comes from the preview with the effective trust in others", () => {
    const drawer = aDrawer();
    const hearer = aCharacter(4, 0, {
      traits: someTraits({ trustInOthers: 0 }),
      tendencies: someTraits({ trustInOthers: 10000 }),
    });

    drawLieOutcomes(drawer, { author, fact: FACT, hearers: [hearer] });

    expect(drawer.finish().records[0]?.p).toBe(2875);
  });
});

describe("lie effects (dialogue-acts §5)", () => {
  it("given a discovered lie when computing its effects then trust, resentment, sincerity and predictability move", () => {
    expect(discoveredLieDeltas(two, liar)).toEqual([
      { kind: "BOND", who: two, toward: liar, axis: "trust", delta: -1500 },
      { kind: "BOND", who: two, toward: liar, axis: "resentment", delta: 1000 },
      { kind: "PERCEPTION", who: two, toward: liar, value: "perceivedSincerity", delta: -3000 },
      { kind: "DRIVE", who: two, drive: "predictability", toward: null, delta: 2000 },
    ]);
  });

  it("given a discovered lie when applying then trust drops by 1500 and not more", () => {
    const denial: StateDelta = { kind: "BOND", who: two, toward: liar, axis: "trust", delta: -200 };
    const hearer = aCharacter(2, 0, { bonds: [aBond(1, { trust: 5000 })] });

    const [after] = applyDeltas(
      [hearer],
      finalizeDeltas([denial, ...discoveredLieDeltas(two, liar)]),
    );

    expect(after?.bonds[0]?.axes.trust).toBe(3500);
  });

  it("given the outcomes of a lie when computing their effects then the detector discovers it, the doubter loses sincerity and the others nothing", () => {
    const deltas = lieOutcomeDeltas(
      [
        { listener: two, kind: "DETECTED" },
        { listener: three, kind: "DOUBTED" },
        { listener: four, kind: "BELIEVED" },
        { listener: four, kind: "KEPT" },
      ],
      liar,
    );

    expect(deltas).toEqual([
      ...discoveredLieDeltas(two, liar),
      { kind: "PERCEPTION", who: three, toward: liar, value: "perceivedSincerity", delta: -1500 },
    ]);
  });

  it("given a copy of the lie when it is discovered then its importance rises by 3000, clamped", () => {
    const character = withCopy(2, 10000);
    const raised = withLieImportance(withLieImportance(character, FACT), FACT);

    expect(raised.memories[0]?.importance).toBe(9000);
    expect(withLieImportance(raised, FACT).memories[0]?.importance).toBe(10000);
  });

  it("given no copy of the lie when it is discovered then the memories are unchanged", () => {
    const character = withCopy(2, 10000);

    expect(withLieImportance(character, factIdOf(7))).toEqual(character);
  });
});

describe("lieDiscoveries (dialogue-acts §5, a lie without a fact)", () => {
  function seen(
    observer: number,
    emitter: number,
    interpretedCause: SignalPerceived["interpretedCause"],
  ): SignalPerceived {
    return {
      kind: "SignalPerceived",
      tick: 3,
      observer: observer as CharacterId,
      emitter: emitter as CharacterId,
      signal: "avertedGaze",
      channel: "VISUAL",
      trueCause: "lying",
      interpretedCause,
    };
  }

  it("given the signals of a tick when finding who discovers the lie then only DIRECT hearers who read lying in the liar count, once each and in id order", () => {
    const events = [
      seen(4, 1, "lying"),
      seen(2, 1, "shame"),
      seen(3, 1, "lying"),
      seen(3, 1, "lying"),
      seen(2, 4, "lying"),
      seen(5, 1, "lying"),
      seen(6, 1, "lying"),
    ];
    const lie = { author: liar, hearers: ids(2, 3, 4, 6), discovered: ids(6) };

    expect(lieDiscoveries(events, lie)).toEqual([three, four]);
  });
});
