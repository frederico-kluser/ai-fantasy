import { describe, expect, it } from "vitest";

import {
  aLabel,
  anActFact,
  aHistoryFact,
  aboutFact,
  factIdOf,
  ids,
} from "../../test/support/acts.ts";
import {
  aBond,
  aCharacter,
  someDrives,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { aCandidate, aDecisionScene, anObligation } from "../../test/support/decision.ts";
import { toBipolarBp, toBp } from "../domain/bp.ts";
import type { CharacterId, ThingId } from "../domain/ids.ts";
import { idOf } from "../../test/support/space.ts";
import { createCopy } from "../memory/copy.ts";
import { satisfaction } from "./satisfaction.ts";
import {
  deficitToward,
  repetitions,
  satisfactionContext,
  scoreCandidate,
  singleTarget,
} from "./utility.ts";

const thing = { type: "THING", thing: 3 as ThingId } as const;
const listener = (id: number, cell: number) => aCharacter(id, cell);

describe("scoreCandidate (simulation-model §10 item 3)", () => {
  it("given known drives, satisfaction and biases when scoring a candidate then U follows the formula term by term", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({
        weights: { company: 8000, intimacy: 7000 },
        deficits: { company: 5000 },
        directed: { intimacy: [[2, 6000]] },
      }),
      emotions: someEmotions({ joy: 2000 }),
      traits: someTraits({ sociability: 4000 }),
      bonds: [aBond(2, { affection: 5000 })],
      associations: [
        { subject: { kind: "THING", thing: 3 as ThingId }, valence: toBipolarBp(5000) },
      ],
    });
    const earlier = anActFact(0, 1, aLabel({ act: "CHAT", topic: thing }));
    const scene = aDecisionScene(author, { others: [listener(2, 1)], facts: [earlier] });
    const company = 3600; // mulBp(mulBp(8000, 5000), 9000)
    const intimacy = 2520; // mulBp(mulBp(7000, 6000), 6000): CHAT 2 beats WARM 1
    const goal = 1200; // intimacy is dominant and served at 6000: mulBp(6000, 2000)
    const emotions = 600; // joy 2000 × (CHAT 1500 + WARM 1500)
    const traits = 400; // sociability 4000 × CHAT 1000
    const bond = 1000; // affection 5000 × WARM 2000
    const perception = 250; // preview interest 5000 / 4 × (CHAT 1000 + WARM 1000)
    const association = 1000; // the thing, valence 5000 × 2000
    const repeated = -1500; // one CHAT about the same thing among the last 6

    expect(
      scoreCandidate(
        scene,
        aCandidate({ act: "CHAT", tone: "WARM", targets: ids(2), topic: thing }),
      ),
    ).toBe(
      company + intimacy + goal + emotions + traits + bond + perception + association + repeated,
    );
  });

  it("given physical relief at 10000 when scoring then no level 3 to 5 drive contributes", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({
        weights: { company: 10000, curiosity: 10000, recognition: 10000 },
        deficits: { physical_relief: 10000, company: 10000, curiosity: 10000, recognition: 10000 },
      }),
    });

    expect(scoreCandidate(aDecisionScene(author), aCandidate({ act: "CHAT" }))).toBe(0);
  });

  it("given physical relief at 7500 when scoring then company counts at half its weight", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({
        weights: { company: 10000 },
        deficits: { physical_relief: 7500, company: 10000 },
      }),
    });

    expect(scoreCandidate(aDecisionScene(author), aCandidate({ act: "CHAT" }))).toBe(4500);
  });

  it("given a candidate that answers an obligation when scoring then it takes 4000 more", () => {
    const scene = aDecisionScene(aCharacter(1, 0));

    expect(scoreCandidate(scene, aCandidate({ act: "STAY_SILENT" }, true))).toBe(4000);
  });

  it("given a dominant directed drive of weight 6999 when scoring then there is no goal bonus", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({ weights: { intimacy: 6999 }, directed: { intimacy: [[2, 10000]] } }),
    });
    const scene = aDecisionScene(author, { others: [listener(2, 1)] });

    expect(scoreCandidate(scene, aCandidate({ act: "CHAT", targets: ids(2) }))).toBe(4199);
  });

  it("given a group whose listeners have different bonds when scoring then the bond bias is the truncated mean", () => {
    const author = aCharacter(1, 0, {
      bonds: [aBond(2, { affection: 5000 }), aBond(3, { affection: 2005 })],
    });
    const scene = aDecisionScene(author, { others: [listener(3, 2), listener(2, 1)] });
    // WARM: 1000 and 401 of bond, 125 and 50 of the perceived interest of the preview
    const mean = 788; // (1125 + 451) / 2, truncated

    expect(
      scoreCandidate(scene, aCandidate({ act: "GREET", tone: "WARM", targets: "GROUP" })),
    ).toBe(mean);
  });
});

describe("deficitToward and singleTarget", () => {
  const drives = someDrives({ deficits: { fun: 300 }, directed: { care: [[2, 4000]] } });

  it.each([
    ["care", 2, 4000],
    ["care", null, 0],
    ["care", 5, 0],
    ["fun", null, 300],
  ] as const)(
    "given %s toward %s when reading the deficit then it is %i",
    (drive, target, expected) => {
      expect(deficitToward(drives, drive, target as CharacterId | null)).toBe(expected);
    },
  );

  it.each([
    [ids(2), 2],
    [ids(2, 3), null],
    ["GROUP", null],
    [ids(), null],
  ] as const)(
    "given the targets %j when reading the single target then it is %s",
    (targets, expected) => {
      expect(singleTarget(aLabel({ targets }))).toBe(expected);
    },
  );
});

describe("repetitions (simulation-model §10)", () => {
  const chat = aLabel({ act: "CHAT", topic: thing });
  const own = (id: number, label = chat) => anActFact(id, 1, label);

  it("given seven own CHATs about the same thing when counting then only the last 6 count", () => {
    const facts = [0, 1, 2, 3, 4, 5, 6].map((id) => own(id));
    const scene = aDecisionScene(aCharacter(1, 0), { facts });

    expect(repetitions(scene, chat)).toBe(6);
  });

  it("given an older repetition pushed out by six other own acts when counting then it does not count", () => {
    const other = aLabel({ act: "GREET" });
    const facts = [own(0), ...[1, 2, 3, 4, 5, 6].map((id) => own(id, other))];
    const scene = aDecisionScene(aCharacter(1, 0), { facts });

    expect(repetitions(scene, chat)).toBe(0);
  });

  it("given the same act on another topic and the same act by another author when counting then neither counts", () => {
    const facts = [own(0, aLabel({ act: "CHAT" })), anActFact(1, 2, chat)];
    const scene = aDecisionScene(aCharacter(1, 0), { facts });

    expect(repetitions(scene, chat)).toBe(0);
  });
});

describe("satisfactionContext", () => {
  it("given an ACCEPT of a REQUEST of MONEY when reading the context then the answered drive is the giver's", () => {
    const request = anActFact(
      0,
      2,
      aLabel({
        act: "REQUEST",
        targets: ids(1),
        topic: { type: "PERSON", person: idOf(1) },
        object: "MONEY",
      }),
    );
    const owed = anObligation(1, 2, 0, "REQUEST", request.label.topic);
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [listener(2, 1)],
      facts: [request],
      obligations: [owed],
    });
    const accept = aLabel({ act: "ACCEPT", targets: ids(2), topic: request.label.topic });

    expect(satisfactionContext(scene, accept).answered).toBe("influence");
  });

  it.each([
    ["OFFER", { object: "INFORMATION" }, "curiosity"],
    ["APOLOGIZE", {}, "intimacy"],
    ["THREATEN", {}, "physical_safety"],
  ] as const)(
    "given an ACCEPT of a %s with %j when reading the context then the answered drive is %s",
    (act, extra, drive) => {
      const topic = { type: "PERSON", person: idOf(1) } as const;
      const request = anActFact(0, 2, aLabel({ act, targets: ids(1), topic, ...extra }));
      const scene = aDecisionScene(aCharacter(1, 0), {
        others: [listener(2, 1)],
        facts: [request],
        obligations: [anObligation(1, 2, 0, act, topic)],
      });

      expect(
        satisfactionContext(scene, aLabel({ act: "ACCEPT", targets: ids(2), topic })).answered,
      ).toBe(drive);
    },
  );

  it("given a REFUSE that answers a THREATEN when reading the satisfaction then the drive the threat serves is not served", () => {
    const topic = { type: "PERSON", person: idOf(1) } as const;
    const request = anActFact(0, 2, aLabel({ act: "THREATEN", targets: ids(1), topic }));
    const scene = aDecisionScene(aCharacter(1, 0), {
      facts: [request],
      obligations: [anObligation(1, 2, 0, "THREATEN", topic)],
    });
    const refuse = aLabel({ act: "REFUSE", targets: ids(2), topic });

    expect(
      satisfaction("REFUSE", "NEUTRAL", "physical_safety", satisfactionContext(scene, refuse)),
    ).toBe(0);
  });

  it("given a TELL of a fact with an offender, by the author's copy, when reading the context then the fact is bad", () => {
    const fact = aHistoryFact(0, 2, 3, { offenders: ids(2) });
    const author = aCharacter(1, 0, {
      memories: [createCopy(fact.id, { perspective: "DIRECT" }, toBp(0))],
    });
    const scene = aDecisionScene(author, { facts: [fact] });

    expect([
      satisfactionContext(scene, aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) })).badFact,
      satisfactionContext(
        scene,
        aLabel({ act: "TELL", topic: aboutFact("EVENT", 0), isFalse: true }),
      ).badFact,
      satisfactionContext(scene, aLabel({ act: "TELL" })).badFact,
    ]).toEqual([true, false, false]);
  });

  it.each([
    [5000, true],
    [4999, false],
  ] as const)(
    "given justice %i toward the target when reading the context then the target is an offender: %s",
    (deficit, expected) => {
      const author = aCharacter(1, 0, {
        drives: someDrives({ directed: { justice: [[2, deficit]] } }),
      });

      expect(
        satisfactionContext(aDecisionScene(author), aLabel({ targets: ids(2) })).targetOffender,
      ).toBe(expected);
    },
  );
});

describe("scoreCandidate: who the biases look at", () => {
  it("given a target who is absent when scoring then there is no bias toward it", () => {
    const scene = aDecisionScene(aCharacter(1, 0, { bonds: [aBond(9, { trust: 9000 })] }), {
      others: [listener(2, 1)],
    });

    expect(scoreCandidate(scene, aCandidate({ act: "TELL", targets: ids(9) }))).toBe(0);
  });

  it("given a single target and another listener with another bond when scoring then only the target counts", () => {
    const author = aCharacter(1, 0, {
      bonds: [aBond(2, { affection: 5000 }), aBond(3, { affection: 0, resentment: 9000 })],
    });
    const scene = aDecisionScene(author, { others: [listener(3, 2), listener(2, 1)] });

    expect(scoreCandidate(scene, aCandidate({ act: "GREET", tone: "WARM", targets: ids(2) }))).toBe(
      1125,
    );
  });

  it("given a group with a listener out of normal reach when scoring then the mean is over those who hear it", () => {
    const author = aCharacter(1, 0, {
      bonds: [
        aBond(2, { affection: 5000 }),
        aBond(3, { affection: 5000 }),
        aBond(4, { resentment: 9000 }),
      ],
    });
    const scene = aDecisionScene(author, {
      others: [listener(2, 1), listener(3, 2), listener(4, 20)],
    });

    expect(
      scoreCandidate(scene, aCandidate({ act: "GREET", tone: "WARM", targets: "GROUP" })),
    ).toBe(1125);
  });

  it("given a dominant directed drive served below 6000 when scoring then there is no goal bonus", () => {
    const author = aCharacter(1, 0, {
      drives: someDrives({ weights: { justice: 7000 }, directed: { justice: [[2, 10000]] } }),
    });
    const scene = aDecisionScene(author, { others: [listener(2, 1)] });

    expect(scoreCandidate(scene, aCandidate({ act: "TEASE", targets: ids(2) }))).toBe(2100);
  });
});

describe("repetitions: what counts", () => {
  it("given a history fact of the author and an own act of another kind on the same topic when counting then neither counts", () => {
    const facts = [aHistoryFact(0, 1, 2), anActFact(1, 1, aLabel({ act: "TELL" }))];
    const scene = aDecisionScene(aCharacter(1, 0), { facts });

    expect(repetitions(scene, aLabel({ act: "CHAT" }))).toBe(0);
  });
});

describe("satisfactionContext: which fact and which copy", () => {
  it("given two facts and a TELL of the second, bad one when reading the context then the second is read", () => {
    const facts = [aHistoryFact(0, 2, 3), aHistoryFact(1, 2, 3, { offenders: ids(2) })];
    const author = aCharacter(1, 0, {
      memories: [
        createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0)),
        createCopy(factIdOf(1), { perspective: "DIRECT" }, toBp(0)),
      ],
    });
    const scene = aDecisionScene(author, { facts });

    expect([
      satisfactionContext(scene, aLabel({ act: "TELL", topic: aboutFact("EVENT", 1) })).badFact,
      satisfactionContext(scene, aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) })).badFact,
    ]).toEqual([true, false]);
  });

  it("given the author believed a lie that blames someone for a fact without offenders when reading the context then the fact is bad", () => {
    const facts = [aHistoryFact(0, 2, 3, { offenders: ids(2) }), aHistoryFact(1, 2, 3)];
    const author = aCharacter(1, 0, {
      memories: [
        createCopy(factIdOf(0), { perspective: "DIRECT" }, toBp(0), []),
        createCopy(
          factIdOf(1),
          { perspective: "TOLD", tellerFidelity: toBp(9000) },
          toBp(0),
          ids(3),
        ),
      ],
    });
    const scene = aDecisionScene(author, { facts });

    expect([
      satisfactionContext(scene, aLabel({ act: "TELL", topic: aboutFact("RUMOR", 1) })).badFact,
      satisfactionContext(scene, aLabel({ act: "TELL", topic: aboutFact("EVENT", 0) })).badFact,
    ]).toEqual([true, false]);
  });

  it("given the request answered is not the first fact when reading the context then its own object decides", () => {
    const topic = { type: "PERSON", person: idOf(1) } as const;
    const facts = [
      anActFact(0, 2, aLabel({ act: "OFFER", targets: ids(1), topic, object: "DATE" })),
      anActFact(1, 2, aLabel({ act: "OFFER", targets: ids(1), topic, object: "INFORMATION" })),
    ];
    const scene = aDecisionScene(aCharacter(1, 0), {
      others: [listener(2, 1)],
      facts,
      obligations: [anObligation(1, 2, 1, "OFFER", topic)],
    });

    expect(
      satisfactionContext(scene, aLabel({ act: "ACCEPT", targets: ids(2), topic })).answered,
    ).toBe("curiosity");
  });
});
