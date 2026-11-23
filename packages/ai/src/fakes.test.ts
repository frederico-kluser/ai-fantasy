import { describe, expect, it } from "vitest";

import { validateAnswers } from "./answers.ts";
import { createFakeSystemOne, createFakeTextModel, FAKE_USAGE } from "./fakes.ts";
import type { DecisionCall } from "./prompts/questions.ts";

const CALL: DecisionCall = {
  state: "s",
  questions: {
    act: { type: "choice", instructions: "Act?", criteria: { GREET: null, TEASE: null } },
    intensity: {
      type: "score",
      instructions: "How?",
      criteria: ["2", "3", "4", "5", "6", "7", "8", "9", "10"],
    },
    isFalse: { type: "noul", instructions: "Lie?" },
  },
};

describe("createFakeSystemOne (ai-integration §8)", () => {
  it("given no table when the fake answers then each question gets the default", async () => {
    const reply = await createFakeSystemOne().decide(CALL);

    expect(reply).toEqual({
      ok: true,
      value: {
        answers: {
          act: { type: "choice", choice: "GREET", probabilities: { GREET: 1 }, confidence: 1 },
          intensity: { type: "score", score: 2, probabilities: { "2": 1 }, confidence: 1 },
          isFalse: { type: "noul", noul: 0 },
        },
        usage: FAKE_USAGE,
      },
    });
  });

  it("given a table when the fake answers then the table answer is used", async () => {
    const fake = createFakeSystemOne({ answers: { act: { type: "choice", choice: "TEASE" } } });

    const reply = await fake.decide(CALL);

    expect(reply).toMatchObject({ value: { answers: { act: { choice: "TEASE" } } } });
  });

  it("given a table with questions not asked when the fake answers then they are left out", async () => {
    const fake = createFakeSystemOne({ answers: { other: { type: "noul", noul: 1 } } });

    const reply = await fake.decide(CALL);

    expect(Object.keys((reply as { value: { answers: object } }).value.answers)).toEqual([
      "act",
      "intensity",
      "isFalse",
    ]);
  });

  it("given the default answers when validating then they pass", async () => {
    const reply = await createFakeSystemOne().decide(CALL);

    expect(
      validateAnswers(CALL.questions, (reply as { value: { answers: unknown } }).value.answers).ok,
    ).toBe(true);
  });

  it("given a failure when the fake answers then it fails", async () => {
    const reply = await createFakeSystemOne({ failure: { kind: "TIMEOUT" } }).decide(CALL);

    expect(reply).toEqual({ ok: false, error: { kind: "TIMEOUT" } });
  });

  it("given two calls when the fake answers then it records them in order", async () => {
    const fake = createFakeSystemOne();
    const second = { ...CALL, state: "second" };

    await fake.decide(CALL);
    await fake.decide(second);

    expect(fake.calls).toEqual([CALL, second]);
  });
});

describe("createFakeTextModel (ai-integration §8)", () => {
  const REQUEST = { system: "act", package: { act: "GREET" } };

  it("given no lines when the fake renders then it returns the default line", async () => {
    expect(await createFakeTextModel().renderLine(REQUEST)).toEqual({
      ok: true,
      value: { line: { fala: "Certo.", gesto: "" }, usage: FAKE_USAGE },
    });
  });

  it("given scripted lines when the fake renders then they cycle by call index", async () => {
    const fake = createFakeTextModel({ lines: ["a", "b", "c"] });

    const replies = [
      await fake.renderLine(REQUEST),
      await fake.renderLine(REQUEST),
      await fake.renderLine(REQUEST),
      await fake.renderLine(REQUEST),
    ];

    expect(replies.map((reply) => (reply as { value: { line: unknown } }).value.line)).toEqual([
      "a",
      "b",
      "c",
      "a",
    ]);
  });

  it("given a failure when the fake renders then it fails and records the request", async () => {
    const fake = createFakeTextModel({ failure: { kind: "REFUSED", message: "no" } });

    const reply = await fake.renderLine(REQUEST);

    expect([reply, fake.requests]).toEqual([
      { ok: false, error: { kind: "REFUSED", message: "no" } },
      [REQUEST],
    ]);
  });
});

describe("FAKE_USAGE", () => {
  it("given the fakes when reading their usage then it is a fake model with nothing spent", () => {
    expect(FAKE_USAGE).toEqual({
      model: "fake",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      latencyMs: 0,
    });
  });

  it("given no scripted line when building the fake text model then it is refused", () => {
    expect(() => createFakeTextModel({ lines: [] })).toThrow(
      "the fake text model needs at least one scripted line",
    );
  });
});
