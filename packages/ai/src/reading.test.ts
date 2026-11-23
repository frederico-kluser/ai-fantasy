import { describe, expect, it } from "vitest";

import type { ReadAnswer } from "./answers.ts";
import { readPlayerAnswers } from "./reading.ts";
import { charId, factId, playerLineInput, presets } from "../test/fixtures.ts";

/** A validated choice; `as` brands the plain numbers of the test as bp. */
function choice(value: string, top = 9000): ReadAnswer {
  return { type: "choice", choice: value, probabilities: {}, top } as ReadAnswer;
}

/** Lia greets Otávio warmly, about Otávio, intensity 6 (5000 bp), normal volume. */
function answers(overrides: Record<string, ReadAnswer> = {}): Record<string, ReadAnswer> {
  return {
    act: choice("GREET"),
    tone: choice("WARM"),
    target: choice("char_4"),
    topicType: choice("PERSON"),
    topicRef: choice("ref_1"),
    object: choice("NONE"),
    intensity: { type: "score", score: 6, intensity: 5000, top: 8000 } as ReadAnswer,
    volume: choice("NORMAL"),
    isFalse: { type: "noul", probability: 1000, yes: false } as ReadAnswer,
    blamed: choice("NONE"),
    ...overrides,
  };
}

function read(overrides: Record<string, ReadAnswer> = {}) {
  return readPlayerAnswers(playerLineInput(), presets(), answers(overrides));
}

describe("readPlayerAnswers (dialogue-acts §11)", () => {
  it("given confident answers when reading then the candidate label carries the act", () => {
    expect(read().candidate).toEqual({
      act: "GREET",
      tone: "WARM",
      targets: [charId(4)],
      topic: { type: "PERSON", person: charId(4) },
      intensity: 5000,
      volume: "NORMAL",
      isFalse: false,
    });
  });

  it("given confident answers when reading then no confirmation is needed", () => {
    expect(read()).toMatchObject({
      act: "GREET",
      confidence: 9000,
      needsConfirmation: false,
      gaps: [],
    });
  });

  it("given NOBODY when reading then the targets are empty", () => {
    expect(read({ target: choice("NOBODY") }).candidate?.targets).toEqual([]);
  });

  it("given GROUP when reading then the targets are the group", () => {
    expect(read({ target: choice("GROUP") }).candidate?.targets).toBe("GROUP");
  });

  it("given MOVE with a target when reading then the act is APPROACH", () => {
    expect(read({ act: choice("MOVE") }).candidate).toMatchObject({
      act: "APPROACH",
      topic: { type: "NONE" },
    });
  });

  it("given MOVE without a target when reading then it stays MOVE with a destination gap", () => {
    const reading = read({ act: choice("MOVE"), target: choice("NOBODY") });

    expect([reading.candidate?.act, reading.gaps, reading.needsConfirmation]).toEqual([
      "MOVE",
      ["DESTINATION"],
      true,
    ]);
  });

  it("given MOVE toward the group when reading then it stays MOVE with a destination gap", () => {
    expect(read({ act: choice("MOVE"), target: choice("GROUP") }).gaps).toEqual(["DESTINATION"]);
  });

  it("given an object on a CHAT when reading then it is ignored", () => {
    expect(read({ act: choice("CHAT"), object: choice("MONEY") }).candidate).not.toHaveProperty(
      "object",
    );
  });

  it.each([["REQUEST"], ["OFFER"]])(
    "given an object on a %s when reading then it is kept",
    (act) => {
      expect(read({ act: choice(act), object: choice("MONEY") }).candidate?.object).toBe("MONEY");
    },
  );

  it("given a REQUEST with no object when reading then the label has none", () => {
    expect(read({ act: choice("REQUEST") }).candidate).not.toHaveProperty("object");
  });

  it("given a lie that blames someone when reading then the label carries who is blamed", () => {
    const reading = read({
      isFalse: { type: "noul", probability: 8000, yes: true } as ReadAnswer,
      blamed: choice("char_7"),
    });

    expect([reading.candidate?.isFalse, reading.candidate?.blamed]).toEqual([true, charId(7)]);
  });

  it("given a lie that blames nobody when reading then the label has no one blamed", () => {
    const reading = read({ isFalse: { type: "noul", probability: 8000, yes: true } as ReadAnswer });

    expect(reading.candidate).not.toHaveProperty("blamed");
  });

  it("given blamed without isFalse when reading then it is ignored", () => {
    expect(read({ blamed: choice("char_7") }).candidate).not.toHaveProperty("blamed");
  });

  it("given a topic ref of the type read when reading then it is the topic", () => {
    const reading = read({
      act: choice("ACCUSE"),
      topicType: choice("EVENT"),
      topicRef: choice("ref_2"),
    });

    expect(reading.candidate?.topic).toEqual({ type: "EVENT", fact: factId(0) });
  });

  it("given a topic ref of another type when reading then the topic is NONE with a gap", () => {
    const reading = read({ topicType: choice("EVENT") });

    expect([reading.candidate?.topic, reading.gaps, reading.needsConfirmation]).toEqual([
      { type: "NONE" },
      ["TOPIC"],
      true,
    ]);
  });

  it.each([["NONE"], ["OTHER"]])(
    "given the topic ref %s when reading then there is a topic gap",
    (ref) => {
      expect(read({ topicRef: choice(ref) }).gaps).toEqual(["TOPIC"]);
    },
  );

  it("given SMALL_TALK when reading then the topic needs no reference", () => {
    const reading = read({ topicType: choice("SMALL_TALK"), topicRef: choice("NONE") });

    expect([reading.candidate?.topic, reading.gaps]).toEqual([{ type: "SMALL_TALK" }, []]);
  });

  it("given a silent act when reading then the topic is NONE and the ref is ignored", () => {
    const reading = read({ act: choice("STAY_SILENT"), topicRef: choice("OTHER") });

    expect([reading.candidate?.topic, reading.gaps]).toEqual([{ type: "NONE" }, []]);
  });

  it("given act and target top probabilities when reading then the confidence is the smaller one", () => {
    const reading = read({ act: choice("GREET", 8200), target: choice("char_4", 7600) });

    expect(reading.confidence).toBe(7600);
  });

  it("given a confidence of 6999 when reading then confirmation is needed", () => {
    expect(read({ act: choice("GREET", 6999) }).needsConfirmation).toBe(true);
  });

  it("given a confidence of 7000 when reading then no confirmation is needed", () => {
    expect(read({ target: choice("char_4", 7000) }).needsConfirmation).toBe(false);
  });

  it("given the act OTHER when reading then there is no candidate and confirmation is needed", () => {
    expect(read({ act: choice("OTHER") })).toMatchObject({
      act: "OTHER",
      candidate: undefined,
      needsConfirmation: true,
    });
  });

  it("given a reading when reading then the original answers are kept", () => {
    expect(read().answers).toEqual(answers());
  });

  it("given loud aggressive answers when reading then volume and tone follow", () => {
    expect(read({ tone: choice("AGGRESSIVE"), volume: choice("SHOUT") }).candidate).toMatchObject({
      tone: "AGGRESSIVE",
      volume: "SHOUT",
    });
  });

  it("given an act that was not offered when reading then it throws", () => {
    expect(() => read({ act: choice("DANCE") })).toThrow(
      "the answer to act is not one of the options offered",
    );
  });

  it("given a missing target answer when reading then it throws", () => {
    expect(() =>
      read({ target: { type: "noul", probability: 0, yes: false } as ReadAnswer }),
    ).toThrow("the answer to target is not a validated choice");
  });
});
