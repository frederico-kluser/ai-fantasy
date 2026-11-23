import { describe, expect, it } from "vitest";

import { defaultObjects } from "../../test/support/acts.ts";
import type { AnswerView } from "./effect-terms.ts";
import { requestDrives, responderTerms } from "./request-answers.ts";

const OBJECTS = defaultObjects();

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
