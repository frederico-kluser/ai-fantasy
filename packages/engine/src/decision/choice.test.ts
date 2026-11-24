import { describe, expect, it } from "vitest";

import {
  aDrawer,
  aHistoryFact,
  aLabel,
  anActFact,
  factIdOf,
  forcing,
  ids,
} from "../../test/support/acts.ts";
import { aCharacter, someTraits } from "../../test/support/character.ts";
import { aCandidate, aDecisionScene, anObligation } from "../../test/support/decision.ts";
import { idOf } from "../../test/support/space.ts";
import { toBp } from "../domain/bp.ts";
import { createCopy, type FactCopy } from "../memory/copy.ts";
import { owedBands, requestTurnInput, type OwedBandsInput } from "./bands.ts";
import { defaultObjects } from "../../test/support/acts.ts";
import { bestCandidates, chooseAct, choiceWeights } from "./choice.ts";

describe("choiceWeights (simulation-model §10 item 4)", () => {
  it("given selfControl 5000 and five candidates when weighting then each weight is the capped difference squared", () => {
    expect(choiceWeights([20000, 9000, 600, 500, 100], 5000)).toEqual([
      10000 * 10000,
      8901 * 8901,
      501 * 501,
      401 * 401,
      1,
    ]);
  });

  it.each([
    [3000, [101 * 101, 1]],
    [2999, [101, 1]],
    [-2999, [101, 1]],
    [-3000, [2101, 2001]],
  ] as const)(
    "given selfControl %i when weighting then the weights are %j",
    (selfControl, expected) => {
      expect(choiceWeights([600, 500], selfControl)).toEqual(expected);
    },
  );

  it("given the largest weights when summing then the total of five stays below 2^31", () => {
    const total = choiceWeights([50000, 40000, 30000, 20000, 0], 10000).reduce((a, b) => a + b, 0);

    expect(total).toBeLessThan(2 ** 31);
  });
});

describe("chooseAct", () => {
  const author = aCharacter(1, 0);
  const scene = aDecisionScene(author);
  const six = [
    aCandidate({ act: "STAY_SILENT", topic: { type: "NONE" } }),
    aCandidate({ act: "CHAT", tone: "WARM" }, true),
    aCandidate({ act: "CHAT", tone: "NEUTRAL" }, true),
    aCandidate({ act: "CHAT", tone: "PLAYFUL" }, true),
    aCandidate({ act: "CHAT", tone: "IRONIC" }, true),
    aCandidate({ act: "CHAT", tone: "AGGRESSIVE" }, true),
  ];

  it("given six candidates, five tied above the sixth, when choosing then the five best keep the generation order", () => {
    expect(bestCandidates(scene, six).map(({ candidate }) => candidate.label.tone)).toEqual([
      "WARM",
      "NEUTRAL",
      "PLAYFUL",
      "IRONIC",
      "AGGRESSIVE",
    ]);
  });

  it("given a forced ACT_CHOICE of the author when choosing then the forced option is chosen and the draw is recorded on the choice stream", () => {
    const drawer = aDrawer([forcing("ACT_CHOICE", 3, 1)]);
    const choice = chooseAct(drawer, scene, six);
    const [record] = drawer.finish().records;

    expect([
      choice.chosen.candidate.label.tone,
      record?.stream,
      record?.purpose,
      record?.target,
      record?.bound,
    ]).toEqual(["IRONIC", "choice", "ACT_CHOICE", 1, 5]);
  });

  it("given a single candidate when choosing then it is drawn anyway", () => {
    const drawer = aDrawer();
    const choice = chooseAct(drawer, scene, six.slice(0, 1));

    expect([choice.chosen.candidate.label.act, drawer.finish().records.length]).toEqual([
      "STAY_SILENT",
      1,
    ]);
  });

  it("given a controlled author when choosing then the weights are squared from the utilities", () => {
    const controlled = aDecisionScene(
      aCharacter(1, 0, {
        traits: someTraits({ selfControl: 2000 }),
        tendencies: someTraits({ selfControl: 4000 }),
      }),
    );
    const choice = chooseAct(aDrawer(), controlled, six.slice(0, 2));

    expect(choice.weights).toEqual([4001 * 4001, 1]);
  });

  it("given no candidate when choosing then it is a programming error", () => {
    expect(() => chooseAct(aDrawer(), scene, [])).toThrow(RangeError);
  });
});

describe("owedBands (dialogue-acts §8.2)", () => {
  const topic = { type: "PERSON", person: idOf(1) } as const;
  const request = anActFact(
    0,
    2,
    aLabel({ act: "REQUEST", targets: ids(1), topic, object: "HELP" }),
  );
  const owed = anObligation(1, 2, 0, "REQUEST", topic);
  const input = (overrides: Partial<OwedBandsInput> = {}): OwedBandsInput => ({
    debtor: idOf(1),
    control: "AUTO",
    characters: [aCharacter(1, 0), aCharacter(2, 1)],
    facts: [request],
    obligations: [owed],
    objects: defaultObjects(),
    privacy: toBp(5000),
    drawn: [],
    ...overrides,
  });

  it("given a request whose target switched from MANUAL to AUTO when the target gets the turn then the band is drawn then", () => {
    const manual = aDrawer();
    const whileManual = owedBands(manual, input({ control: "MANUAL" }));
    const auto = aDrawer([forcing("REQUEST_BAND", 3, 1)]);
    const nowAuto = owedBands(auto, input({ drawn: whileManual }));

    expect([
      whileManual,
      manual.finish().records.length,
      nowAuto,
      auto.finish().records.map((r) => [r.stream, r.purpose, r.target]),
    ]).toEqual([
      [],
      0,
      [{ fact: factIdOf(0), debtor: idOf(1), band: "REFUSE" }],
      [["resolution", "REQUEST_BAND", 1]],
    ]);
  });

  it("given a band already drawn when the debtor gets the turn again then nothing is drawn", () => {
    const drawn = [{ fact: factIdOf(0), debtor: idOf(1), band: "ACCEPT" as const }];
    const drawer = aDrawer();

    expect([owedBands(drawer, input({ drawn })), drawer.finish().records.length]).toEqual([
      drawn,
      0,
    ]);
  });

  it("given a band whose obligation ended when updating then the band is dropped", () => {
    const drawn = [{ fact: factIdOf(0), debtor: idOf(1), band: "ACCEPT" as const }];

    expect(owedBands(aDrawer(), input({ drawn, obligations: [] }))).toEqual([]);
  });

  it("given two requests and a question owed, out of order, when drawing then the requests are drawn in fact order and the question is not", () => {
    const second = anActFact(
      1,
      2,
      aLabel({ act: "OFFER", targets: ids(1), topic, object: "HELP" }),
    );
    const asked = anActFact(2, 2, aLabel({ act: "ASK", targets: ids(1), topic }));
    const obligations = [
      anObligation(1, 2, 1, "OFFER", topic),
      anObligation(1, 2, 2, "ASK", topic),
      owed,
      anObligation(3, 2, 0, "REQUEST", topic),
    ];
    const drawer = aDrawer([forcing("REQUEST_BAND", 0, 1)]);
    const bands = owedBands(drawer, input({ facts: [request, second, asked], obligations }));

    expect(bands.map((band) => [band.fact, band.band])).toEqual([
      [0, "ENTHUSIASTIC"],
      [1, "ENTHUSIASTIC"],
    ]);
  });

  it("given a creditor who left when drawing then that band is not drawn", () => {
    const drawer = aDrawer();

    expect([
      owedBands(drawer, input({ characters: [aCharacter(1, 0)] })),
      drawer.finish().records.length,
    ]).toEqual([[], 0]);
  });

  it.each([
    ["DIRECT", 3999, 5000, true],
    ["FRAGMENT", 3999, 5000, false],
    ["DIRECT", 4000, 5000, false],
    ["DIRECT", 3999, 4999, false],
  ] as const)(
    "given a witness with a %s copy, privacy %i and pride %i when reading the request then giving in humiliates: %s",
    (perspective, privacy, pride, expected) => {
      const witness = aCharacter(3, 2, {
        memories: [createCopy(factIdOf(0), { perspective }, toBp(0))],
      });
      const target = aCharacter(1, 0, { traits: someTraits({ pride }) });
      const read = requestTurnInput(
        input({ characters: [target, aCharacter(2, 1), witness], privacy: toBp(privacy) }),
        owed,
      );

      expect(read?.humiliating).toBe(expected);
    },
  );

  it("given the author of the request as the only other with a copy when reading then nobody witnessed", () => {
    const author = aCharacter(2, 1, {
      memories: [createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0))],
    });
    const target = aCharacter(1, 0, { traits: someTraits({ pride: 9000 }) });

    expect(
      requestTurnInput(input({ characters: [target, author], privacy: toBp(0) }), owed)
        ?.humiliating,
    ).toBe(false);
  });
});

describe("owedBands in detail", () => {
  const topic = { type: "PERSON", person: idOf(1) } as const;
  const objects = defaultObjects();
  const base = (overrides: Partial<OwedBandsInput>): OwedBandsInput => ({
    debtor: idOf(1),
    control: "AUTO",
    characters: [aCharacter(1, 0), aCharacter(2, 1), aCharacter(3, 2)],
    facts: [],
    obligations: [],
    objects,
    privacy: toBp(5000),
    drawn: [],
    ...overrides,
  });
  const copyOf = (fact: number) => createCopy(factIdOf(fact), { perspective: "DIRECT" }, toBp(0));
  const band = (fact: number, debtor: number) =>
    ({ fact: factIdOf(fact), debtor: idOf(debtor), band: "ACCEPT" }) as const;

  it("given bands of several obligations when updating then only those whose own obligation pends are kept, and a missing one is drawn", () => {
    const requests = [
      anActFact(0, 2, aLabel({ act: "REQUEST", targets: ids(1), topic, object: "HELP" })),
      anActFact(7, 2, aLabel({ act: "REQUEST", targets: ids(3), topic, object: "HELP" })),
    ];
    const obligations = [
      anObligation(1, 2, 0, "REQUEST", topic),
      anObligation(3, 2, 7, "REQUEST", topic),
    ];
    const drawer = aDrawer([forcing("REQUEST_BAND", 4, 1)]);
    const bands = owedBands(
      drawer,
      base({ facts: requests, obligations, drawn: [band(0, 3), band(7, 1), band(7, 3)] }),
    );

    expect(bands.map((each) => [each.fact, each.debtor, each.band])).toEqual([
      [7, 3, "ACCEPT"],
      [0, 1, "HARD_REFUSE"],
    ]);
  });

  it("given an obligation of another debtor without a band when the debtor draws then the other's band is not drawn", () => {
    const request = anActFact(
      0,
      2,
      aLabel({ act: "REQUEST", targets: ids(3), topic, object: "HELP" }),
    );
    const drawer = aDrawer();
    const bands = owedBands(
      drawer,
      base({ facts: [request], obligations: [anObligation(3, 2, 0, "REQUEST", topic)] }),
    );

    expect([bands, drawer.finish().records.length]).toEqual([[], 0]);
  });

  it("given the request among other facts and characters out of order when reading the turn then its own act, object, author and target are read", () => {
    const facts = [
      anActFact(0, 3, aLabel({ act: "CHAT" })),
      anActFact(
        1,
        2,
        aLabel({ act: "OFFER", tone: "WARM", targets: ids(1), topic, object: "DATE" }),
      ),
    ];
    const read = requestTurnInput(
      base({ facts, characters: [aCharacter(3, 2), aCharacter(2, 1), aCharacter(1, 0)] }),
      anObligation(1, 2, 1, "OFFER", topic),
    );

    expect([read?.request, read?.author.id, read?.target.id]).toEqual([
      { act: "OFFER", tone: "WARM", object: "DATE" },
      2,
      1,
    ]);
  });

  it("given a THREATEN without an object when reading the turn then the object is null", () => {
    const facts = [anActFact(0, 2, aLabel({ act: "THREATEN", targets: ids(1), topic }))];

    expect(
      requestTurnInput(base({ facts }), anObligation(1, 2, 0, "THREATEN", topic))?.request.object,
    ).toBeNull();
  });

  it.each([
    ["the request", [aCharacter(1, 0), aCharacter(2, 1)], []],
    [
      "the target",
      [aCharacter(2, 1)],
      [anActFact(0, 2, aLabel({ act: "REQUEST", targets: ids(1), topic, object: "HELP" }))],
    ],
    ["the fact as an act", [aCharacter(1, 0), aCharacter(2, 1)], [aHistoryFact(0, 2, 1)]],
  ] as const)(
    "given %s missing when reading the turn then there is none",
    (_what, characters, facts) => {
      expect(
        requestTurnInput(base({ characters, facts }), anObligation(1, 2, 0, "REQUEST", topic)),
      ).toBeNull();
    },
  );

  it.each([
    ["the target itself", 1, [copyOf(0)], false],
    ["a witness with copies of other facts too", 3, [copyOf(5), copyOf(0)], true],
    ["a witness with a copy of another fact only", 3, [copyOf(5)], false],
  ] as const)(
    "given %s holding the copies when reading the turn then giving in humiliates: %s",
    (_who, holder, memories, expected) => {
      const facts = [anActFact(0, 2, aLabel({ act: "THREATEN", targets: ids(1), topic }))];
      const holdings = new Map<number, { memories: readonly FactCopy[] }>([[holder, { memories }]]);
      const characters = [1, 2, 3].map((id) => aCharacter(id, id, holdings.get(id) ?? {}));
      const read = requestTurnInput(
        base({ facts, characters, privacy: toBp(0) }),
        anObligation(1, 2, 0, "THREATEN", topic),
      );

      expect(read?.humiliating).toBe(expected);
    },
  );
});
