import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aDrawer, aLabel, defaultObjects, forcing } from "../../test/support/acts.ts";
import {
  aBond,
  aCharacter,
  aPerception,
  someDrives,
  someTraits,
} from "../../test/support/character.ts";
import { toBp } from "../domain/bp.ts";
import { mulBp } from "../domain/math.ts";
import { createRngState } from "../rng/state.ts";
import { createDrawer } from "../rng/drawer.ts";
import type { AnswerView } from "./effect-terms.ts";
import {
  acceptanceChance,
  BANDS,
  bandAt,
  bandOfAnswer,
  bandWidths,
  drawBand,
  fixedReply,
  humiliates,
  requestDrives,
  resolveRequestTurn,
  responderTerms,
  type AcceptanceInput,
} from "./requests.ts";

const OBJECTS = defaultObjects();

const author = aCharacter(1, 0, {
  aptitudes: { perceptiveness: toBp(5000), eloquence: toBp(8000), memory: toBp(5000) },
});

/** A NEUTRAL REQUEST of HELP from 1 to a stranger 2 who has no record of 1, nobody watching. */
function anInput(overrides: Partial<AcceptanceInput> = {}): AcceptanceInput {
  return {
    request: { act: "REQUEST", tone: "NEUTRAL", object: "HELP" },
    author,
    target: aCharacter(2, 1),
    objects: OBJECTS,
    humiliating: false,
    ...overrides,
  };
}

describe("acceptanceChance (dialogue-acts §8.1)", () => {
  it("given known inputs for every term when computing the acceptance chance then p follows the formula term by term and is clamped to 500..9500", () => {
    const target = aCharacter(2, 1, {
      bonds: [aBond(1, { trust: 6000, resentment: 1000, affection: 3000, fearOf: 6000 })],
      perceptions: [aPerception(1, { perceivedSincerity: 7000 })],
      traits: someTraits({ courage: 3000 }),
      tendencies: someTraits({ courage: -10000 }),
      drives: someDrives({ weights: { physical_safety: 7000, dignity: 6999 } }),
    });
    const input = anInput({
      request: { act: "THREATEN", tone: "AGGRESSIVE", object: null },
      target,
      humiliating: true,
    });
    const base = 4000;
    const bond = 1000; // (6000 − 1000) / 5
    const affection = 300; // 3000 / 10
    const sincerity = 400; // (7000 − 5000) / 5
    const eloquence = 300; // (8000 − 5000) / 10
    const tone = 0; // AGGRESSIVE does not lower a THREATEN
    const drive = 1500; // physical_safety dominant; dignity is not
    const threat = 2000; // (6000 − 0 / 2) / 3: effective courage 3000 − 3000 = 0
    const humiliation = -700;

    expect(acceptanceChance(input)).toBe(
      base + bond + affection + sincerity + eloquence + tone + drive + threat + humiliation,
    );
  });

  it("given a stranger with no perception record when computing the chance then sincerity comes from the preview", () => {
    const target = aCharacter(2, 1, { traits: someTraits({ trustInOthers: 4000 }) });

    expect(acceptanceChance(anInput({ target }))).toBe(5000 + 200 + 300);
  });

  it.each([
    ["WARM", 0, 500],
    ["SEDUCTIVE", 5000, 1000],
    ["SEDUCTIVE", 4999, -1000],
    ["IRONIC", 0, -700],
    ["AGGRESSIVE", 0, -1500],
  ] as const)(
    "given a %s REQUEST to someone with attraction %i when computing the chance then the tone moves p by its adjustment",
    (tone, attraction, adjustment) => {
      const target = aCharacter(2, 1, {
        bonds: [aBond(1, { attraction })],
        perceptions: [aPerception(1, { perceivedSincerity: 5000 })],
      });
      const input = anInput({ request: { act: "REQUEST", tone, object: "HELP" }, target });

      expect(acceptanceChance(input)).toBe(5000 + 300 + adjustment);
    },
  );

  it.each([
    ["REQUEST", "INFORMATION", { influence: 7000 }, 1500],
    ["REQUEST", "HELP", { care: 7000 }, 0],
    ["REQUEST", "MONEY", { material_security: 7000, influence: 7000 }, 0],
    ["REQUEST", "HELP", { material_security: 7000 }, 0],
    ["OFFER", "DATE", { desire: 7000 }, 0],
    ["OFFER", "COMPANY", { company: 7000 }, 1500],
    ["THREATEN", null, { dignity: 7000 }, -1500],
  ] as const)(
    "given a %s of %s and dominant drives %j when computing the chance then the drive adjustment is %i",
    (act, object, weights, adjustment) => {
      const target = aCharacter(2, 1, {
        drives: someDrives({ weights }),
        perceptions: [aPerception(1, { perceivedSincerity: 5000 })],
      });
      const input = anInput({ request: { act, tone: "NEUTRAL", object }, target });
      const base = new Map([
        ["REQUEST", 5000],
        ["OFFER", 6000],
        ["THREATEN", 4000],
      ]).get(act);

      expect(acceptanceChance(input)).toBe((base ?? 0) + 300 + adjustment);
    },
  );

  it.each([
    [3000, 1500],
    [2999, 0],
  ])(
    "given an APOLOGIZE to someone whose dominant intimacy toward the author is %i when computing the chance then the adjustment is %i",
    (deficit, adjustment) => {
      const target = aCharacter(2, 1, {
        drives: someDrives({
          weights: { intimacy: 7000 },
          directed: {
            intimacy: [
              [1, deficit],
              [3, 9000],
            ],
          },
        }),
        perceptions: [aPerception(1, { perceivedSincerity: 5000 })],
      });
      const input = anInput({
        request: { act: "APOLOGIZE", tone: "NEUTRAL", object: null },
        target,
      });

      expect(acceptanceChance(input)).toBe(5000 + 300 + adjustment);
    },
  );

  it("given a hostile, humiliating AGGRESSIVE request when computing the chance then p is clamped at 500", () => {
    const target = aCharacter(2, 1, { bonds: [aBond(1, { resentment: 10000 })] });
    const input = anInput({
      request: { act: "REQUEST", tone: "AGGRESSIVE", object: "HELP" },
      target,
      humiliating: true,
    });

    expect(acceptanceChance(input)).toBe(500);
  });

  it("given a loved, trusted WARM offer of a dominant drive when computing the chance then p is clamped at 9500", () => {
    const target = aCharacter(2, 1, {
      bonds: [aBond(1, { trust: 10000, affection: 10000 })],
      perceptions: [aPerception(1, { perceivedSincerity: 10000 })],
      drives: someDrives({ weights: { physical_safety: 10000 } }),
    });
    const input = anInput({ request: { act: "OFFER", tone: "WARM", object: "HELP" }, target });

    expect(acceptanceChance(input)).toBe(9500);
  });
});

describe("humiliates (dialogue-acts §8.1)", () => {
  it.each([
    ["THREATEN", true, 3999, 0, true],
    ["THREATEN", true, 4000, 0, false],
    ["THREATEN", false, 0, 0, false],
    ["REQUEST", true, 0, 5000, true],
    ["REQUEST", true, 0, 4999, false],
    ["APOLOGIZE", true, 0, 5000, true],
    ["OFFER", true, 0, 10000, false],
  ] as const)(
    "given a %s, a witness %s, privacy %i and pride %i when checking then giving in humiliates is %s",
    (act, witnessed, privacy, pride, expected) => {
      const target = aCharacter(2, 1, {
        tendencies: someTraits({ pride: 0 }),
        traits: someTraits({ pride }),
      });

      expect(humiliates({ act, witnessed, privacy: toBp(privacy), target })).toBe(expected);
    },
  );

  it("given a proud target only through the tendency when checking then the effective pride counts", () => {
    const target = aCharacter(2, 1, {
      traits: someTraits({ pride: 2000 }),
      tendencies: someTraits({ pride: 10000 }),
    });

    expect(humiliates({ act: "REQUEST", witnessed: true, privacy: toBp(0), target })).toBe(true);
  });
});

describe("bands (dialogue-acts §8.2)", () => {
  const p = 6000;

  it("given u below mulBp(p, 2000) when drawing a band then the result is ENTHUSIASTIC and the fixed reply is ACCEPT in WARM", () => {
    expect(bandAt(mulBp(p, 2000) - 1, p)).toBe("ENTHUSIASTIC");
    expect(fixedReply("ENTHUSIASTIC")).toEqual({ act: "ACCEPT", tones: ["WARM"], intensity: 8000 });
  });

  it.each([
    [mulBp(p, 2000), "ACCEPT"],
    [mulBp(p, 8000) - 1, "ACCEPT"],
    [mulBp(p, 8000), "PARTIAL"],
    [p - 1, "PARTIAL"],
    [p, "REFUSE"],
    [p + mulBp(10000 - p, 7000) - 1, "REFUSE"],
    [p + mulBp(10000 - p, 7000), "HARD_REFUSE"],
    [9999, "HARD_REFUSE"],
  ] as const)("given u = %i and p = 6000 when finding the band then it is %s", (u, band) => {
    expect(bandAt(u, p)).toBe(band);
  });

  it("given p = 6000 when measuring the bands then their widths follow the table and sum to 10000", () => {
    expect(bandWidths(p)).toEqual([1200, 3600, 1200, 2800, 1200]);
  });

  it("given any p and u when drawing then the weighted draw of the widths and the table agree", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 9500 }),
        fc.integer({ min: 0, max: 9999 }),
        (chance, u) => {
          const widths = bandWidths(chance);
          const index = widths.findIndex(
            (_, i) => widths.slice(0, i + 1).reduce((a, b) => a + b, 0) > u,
          );

          expect(BANDS[index]).toBe(bandAt(u, chance));
        },
      ),
    );
  });

  it.each([
    ["ACCEPT", { act: "ACCEPT", tones: ["WARM", "NEUTRAL"], intensity: null }],
    ["PARTIAL", { act: "ACCEPT", tones: ["NEUTRAL"], intensity: null }],
    ["REFUSE", { act: "REFUSE", tones: ["NEUTRAL"], intensity: null }],
    ["HARD_REFUSE", { act: "REFUSE", tones: ["AGGRESSIVE"], intensity: null }],
  ] as const)("given the band %s when fixing the reply then it is %j", (band, reply) => {
    expect(fixedReply(band)).toEqual(reply);
  });

  it("given a forced band when drawing then it is drawn on the resolution stream as REQUEST_BAND with the target", () => {
    const drawer = aDrawer([forcing("REQUEST_BAND", 3, 2)]);

    const band = drawBand(drawer, 6000, aCharacter(2, 1).id);
    const [record] = drawer.finish().records;

    expect(band).toBe("REFUSE");
    expect(record).toMatchObject({
      stream: "resolution",
      purpose: "REQUEST_BAND",
      target: 2,
      bound: 10000,
    });
  });

  it("given the MOST_LIKELY mode when drawing a band then the widest band wins", () => {
    const drawer = createDrawer(createRngState({ castSeed: 1, sceneSeed: 7 }), {
      tick: 0,
      mode: "MOST_LIKELY",
      forced: [],
    });

    expect(drawBand(drawer, 6000, aCharacter(2, 1).id)).toBe("ACCEPT");
  });
});

describe("resolveRequestTurn (dialogue-acts §8.1 and §8.2)", () => {
  it("given a request to the player in MANUAL when resolving then no band is drawn", () => {
    const drawer = aDrawer();

    expect(resolveRequestTurn(drawer, { ...anInput(), control: "MANUAL" })).toEqual({
      kind: "AWAITING",
    });
    expect(drawer.finish().records).toEqual([]);
  });

  it("given a request to a target in AUTO when resolving then the band is drawn from p and the reply is fixed", () => {
    const drawer = aDrawer([forcing("REQUEST_BAND", 4, 2)]);
    const input = { ...anInput(), control: "AUTO" as const };

    expect(resolveRequestTurn(drawer, input)).toEqual({
      kind: "FIXED",
      chance: acceptanceChance(input),
      band: "HARD_REFUSE",
      reply: fixedReply("HARD_REFUSE"),
    });
  });
});

describe("bandOfAnswer (dialogue-acts §8.2, the player in MANUAL)", () => {
  it.each([
    [aLabel({ act: "ACCEPT", tone: "WARM", intensity: toBp(7000) }), "ENTHUSIASTIC"],
    [aLabel({ act: "ACCEPT", tone: "WARM", intensity: toBp(6999) }), "ACCEPT"],
    [aLabel({ act: "ACCEPT", tone: "SEDUCTIVE", intensity: toBp(9000) }), "ACCEPT"],
    [aLabel({ act: "REFUSE", tone: "AGGRESSIVE" }), "HARD_REFUSE"],
    [aLabel({ act: "REFUSE", tone: "IRONIC" }), "REFUSE"],
    [aLabel({ act: "CHAT" }), null],
  ] as const)("given the answer %j when reading the band then it is %s", (label, band) => {
    expect(bandOfAnswer(label)).toBe(band);
  });
});

describe("requestDrives (dialogue-acts §4 and §8.3)", () => {
  function view(act: AnswerView["act"], object: AnswerView["object"]): AnswerView {
    return { act, band: "ACCEPT", object };
  }

  it("given a REQUEST of MONEY when resolving then the receiver, giver and requested drives come from the object", () => {
    const drives = requestDrives(view("REQUEST", "MONEY"), OBJECTS);

    expect([drives("RECEIVER"), drives("GIVER"), drives("REQUESTED")]).toEqual([
      "material_security",
      "influence",
      "material_security",
    ]);
  });

  it.each([
    ["OFFER", "DATE", "desire"],
    ["APOLOGIZE", null, "intimacy"],
    ["THREATEN", null, "influence"],
  ] as const)(
    "given a %s when resolving the requested drive then it is %s",
    (act, object, drive) => {
      expect(requestDrives(view(act, object), OBJECTS)("REQUESTED")).toBe(drive);
    },
  );

  it("given no answer when resolving then every request drive is dropped", () => {
    const drives = requestDrives(null, OBJECTS);

    expect([drives("RECEIVER"), drives("GIVER"), drives("REQUESTED")]).toEqual([null, null, null]);
  });

  it("given an APOLOGIZE without object when resolving the object drives then they are dropped", () => {
    expect(requestDrives(view("APOLOGIZE", null), OBJECTS)("RECEIVER")).toBeNull();
  });
});

describe("responderTerms (dialogue-acts §8.3, in the one who answers)", () => {
  it.each([
    ["REQUEST", "ACCEPT", "HELP", [{ kind: "DRIVE", drive: "GIVER", k: -1 }]],
    [
      "REQUEST",
      "PARTIAL",
      "ITEM",
      [
        { kind: "DRIVE", drive: "GIVER", k: -1 },
        { kind: "DRIVE", drive: "material_security", k: 1 },
      ],
    ],
    ["OFFER", "ENTHUSIASTIC", "DATE", [{ kind: "DRIVE", drive: "RECEIVER", k: -3 }]],
    [
      "APOLOGIZE",
      "ACCEPT",
      null,
      [
        { kind: "DRIVE", drive: "justice", k: -2 },
        { kind: "BOND", axis: "resentment", k: -2 },
      ],
    ],
    [
      "THREATEN",
      "ACCEPT",
      null,
      [
        { kind: "EMOTION", emotion: "fear", k: 1 },
        { kind: "BOND", axis: "resentment", k: 2 },
        { kind: "DRIVE", drive: "dignity", k: 2 },
      ],
    ],
    ["THREATEN", "HARD_REFUSE", null, [{ kind: "DRIVE", drive: "dignity", k: -1 }]],
    ["REQUEST", "REFUSE", "MONEY", []],
  ] as const)(
    "given a %s answered with %s (%s) when appraising the one who answers then the terms are %j",
    (act, band, object, terms) => {
      expect(responderTerms({ act, band, object })).toEqual(terms);
    },
  );

  it("given a question answered when appraising the one who answers then nothing applies", () => {
    expect(responderTerms({ act: "ASK", band: null, object: null })).toEqual([]);
  });
});
