import { describe, expect, it } from "vitest";

import {
  checkDecisionCall,
  MAX_QUESTIONS_PER_CALL,
  splitIntoCalls,
  type Question,
  type QuestionEntry,
} from "./questions.ts";

const NOUL: Question = { type: "noul", instructions: "Is it raining?" };

function entries(count: number): QuestionEntry[] {
  return Array.from({ length: count }, (_, index) => [`q${index}`, NOUL] as const);
}

const SCORE_LEVELS = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];

describe("splitIntoCalls (ai-integration §4.1)", () => {
  it("given 20 questions for a premise when building then they are split into calls of at most 16", () => {
    const calls = splitIntoCalls({ place: "a tavern" }, entries(20));

    expect(calls.map((call) => Object.keys(call.questions).length)).toEqual([16, 4]);
  });

  it("given 16 questions when splitting then they go in one call", () => {
    expect(splitIntoCalls("state", entries(MAX_QUESTIONS_PER_CALL))).toHaveLength(1);
  });

  it("given no question when splitting then there is no call", () => {
    expect(splitIntoCalls("state", [])).toEqual([]);
  });

  it("given questions when splitting then each call keeps the state and the order", () => {
    const calls = splitIntoCalls("state", entries(17));

    expect(calls[1]).toEqual({ state: "state", questions: { q16: NOUL } });
  });
});

describe("checkDecisionCall", () => {
  it("given a well-formed call when checking then it passes", () => {
    const call = {
      state: "s",
      questions: {
        "a.b-c_1": NOUL,
        choice: { type: "choice", instructions: "Pick", criteria: { A: "first", B: null } },
        score: { type: "score", instructions: "How much", criteria: SCORE_LEVELS },
        rubric: { ...NOUL, criteria: { true: "yes", false: "no" } },
      },
    } as const;

    expect(checkDecisionCall(call)).toEqual({ ok: true, value: call });
  });

  it.each([["has space"], ["x".repeat(97)], [""]])(
    "given the question id %j when checking then it is rejected",
    (id) => {
      expect(checkDecisionCall({ state: "s", questions: { [id]: NOUL } }).ok).toBe(false);
    },
  );

  it("given a 96-character question id when checking then it passes", () => {
    expect(checkDecisionCall({ state: "s", questions: { ["x".repeat(96)]: NOUL } }).ok).toBe(true);
  });

  it("given 17 questions when checking a call then it is rejected", () => {
    const questions = Object.fromEntries(entries(17));

    expect(checkDecisionCall({ state: "s", questions }).ok).toBe(false);
  });

  it("given a call without questions when checking then it is rejected", () => {
    expect(checkDecisionCall({ state: "s", questions: {} }).ok).toBe(false);
  });

  it("given a choice with 256 options when checking then it is rejected", () => {
    const criteria = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`o${i}`, null]));

    const result = checkDecisionCall({
      state: "s",
      questions: { pick: { type: "choice", instructions: "Pick", criteria } },
    });

    expect(result.ok).toBe(false);
  });

  it("given a choice with 255 options when checking then it passes", () => {
    const criteria = Object.fromEntries(Array.from({ length: 255 }, (_, i) => [`o${i}`, null]));

    const result = checkDecisionCall({
      state: "s",
      questions: { pick: { type: "choice", instructions: "Pick", criteria } },
    });

    expect(result.ok).toBe(true);
  });

  it("given a choice with a single option when checking then it is rejected", () => {
    const result = checkDecisionCall({
      state: "s",
      questions: { pick: { type: "choice", instructions: "Pick", criteria: { A: null } } },
    });

    expect(result.ok).toBe(false);
  });

  it("given a noul with half a rubric when checking then it is rejected", () => {
    const half = { type: "noul", instructions: "Rain?", criteria: { true: "yes" } };

    expect(checkDecisionCall({ state: "s", questions: { rain: half } }).ok).toBe(false);
  });

  it("given a score with 8 levels when checking then it is rejected", () => {
    const score = { type: "score", instructions: "How", criteria: SCORE_LEVELS.slice(1) };

    expect(checkDecisionCall({ state: "s", questions: { how: score } }).ok).toBe(false);
  });

  it("given empty instructions when checking then it is rejected", () => {
    const empty = { type: "noul", instructions: "" };

    expect(checkDecisionCall({ state: "s", questions: { rain: empty } }).ok).toBe(false);
  });

  it("given a session id of 257 characters when checking then it is rejected", () => {
    const call = { state: "s", questions: { rain: NOUL }, sessionId: "s".repeat(257) };

    expect(checkDecisionCall(call).ok).toBe(false);
  });

  it("given a rejected call when checking then the error names the problem path", () => {
    const result = checkDecisionCall({ state: "s", questions: { "bad id": NOUL } });

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_CALL", path: "questions.bad id" },
    });
  });
});
