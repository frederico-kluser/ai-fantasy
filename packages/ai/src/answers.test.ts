import { describe, expect, it } from "vitest";

import { validateAnswers } from "./answers.ts";
import type { Question } from "./prompts/questions.ts";

const QUESTIONS: Readonly<Record<string, Question>> = {
  act: { type: "choice", instructions: "Act?", criteria: { GREET: "greet", TEASE: null } },
  intensity: {
    type: "score",
    instructions: "How strong?",
    criteria: ["2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  isFalse: { type: "noul", instructions: "A lie?" },
};

const VALID = {
  act: {
    type: "choice",
    choice: "TEASE",
    probabilities: { TEASE: 0.71, GREET: 0.29 },
    confidence: 0.71,
  },
  intensity: { type: "score", score: 7.3, probabilities: { "7": 0.7, "8": 0.3 } },
  isFalse: { type: "noul", noul: 0.83 },
};

function errorOf(raw: unknown): unknown {
  // The tests compare the error of a failed result; an ok result has none.
  return (validateAnswers(QUESTIONS, raw) as { error?: unknown }).error;
}

describe("validateAnswers (ai-integration §4.2)", () => {
  it("given valid answers when validating then each one is converted to bp", () => {
    expect(validateAnswers(QUESTIONS, VALID)).toEqual({
      ok: true,
      value: {
        act: {
          type: "choice",
          choice: "TEASE",
          probabilities: { TEASE: 7100, GREET: 2900 },
          top: 7100,
        },
        intensity: { type: "score", score: 7.3, intensity: 6625, top: 7000 },
        isFalse: { type: "noul", probability: 8300, yes: true },
      },
    });
  });

  it.each([[null], [[]], ["text"], [42]])(
    "given answers that are %j when validating then it fails closed",
    (raw) => {
      expect(errorOf(raw)).toEqual({ code: "NOT_AN_OBJECT", question: null });
    },
  );

  it("given a missing answer when validating then it fails closed", () => {
    const raw = { act: VALID.act, intensity: VALID.intensity };

    expect(errorOf(raw)).toEqual({ code: "MISSING_ANSWER", question: "isFalse" });
  });

  it("given an answer to a question not asked when validating then it fails closed", () => {
    expect(errorOf({ ...VALID, extra: { type: "noul", noul: 1 } })).toEqual({
      code: "UNEXPECTED_ANSWER",
      question: "extra",
    });
  });

  it("given an answer of the wrong type when validating then it fails closed", () => {
    expect(errorOf({ ...VALID, act: { type: "noul", noul: 0.4 } })).toEqual({
      code: "WRONG_TYPE",
      question: "act",
    });
  });

  it("given a choice outside the options when validating then it fails closed", () => {
    expect(errorOf({ ...VALID, act: { type: "choice", choice: "DANCE" } })).toEqual({
      code: "UNKNOWN_OPTION",
      question: "act",
    });
  });

  it("given a probability for an option that does not exist when validating then it fails closed", () => {
    const act = { type: "choice", choice: "TEASE", probabilities: { TEASE: 0.5, DANCE: 0.5 } };

    expect(errorOf({ ...VALID, act })).toEqual({ code: "UNKNOWN_OPTION", question: "act" });
  });

  it("given a choice distribution that does not sum to one when validating then it fails closed", () => {
    const act = { type: "choice", choice: "TEASE", probabilities: { TEASE: 0.7, GREET: 0.5 } };

    expect(errorOf({ ...VALID, act })).toEqual({
      code: "INCOHERENT_DISTRIBUTION",
      question: "act",
    });
  });

  it.each([[0.9], [0.5], [1.02]])(
    "given a partial distribution that sums to %s when validating then it is accepted",
    (sum) => {
      const act = {
        type: "choice",
        choice: "TEASE",
        probabilities: { TEASE: sum - 0.2, GREET: 0.2 },
      };

      expect(validateAnswers(QUESTIONS, { ...VALID, act }).ok).toBe(true);
    },
  );

  it("given a distribution that sums to 1.03 when validating then it fails closed", () => {
    const act = { type: "choice", choice: "TEASE", probabilities: { TEASE: 0.53, GREET: 0.5 } };

    expect(errorOf({ ...VALID, act })).toEqual({
      code: "INCOHERENT_DISTRIBUTION",
      question: "act",
    });
  });

  it("given an empty or all-zero distribution when validating then it fails closed", () => {
    const empty = { type: "choice", choice: "TEASE", probabilities: {} };
    const zero = { type: "choice", choice: "TEASE", probabilities: { TEASE: 0 } };

    expect([errorOf({ ...VALID, act: empty }), errorOf({ ...VALID, act: zero })]).toEqual([
      { code: "INCOHERENT_DISTRIBUTION", question: "act" },
      { code: "INCOHERENT_DISTRIBUTION", question: "act" },
    ]);
  });

  it("given a choice that is not the most probable option listed when validating then it fails closed", () => {
    const act = { type: "choice", choice: "GREET", probabilities: { TEASE: 0.6, GREET: 0.3 } };

    expect(errorOf({ ...VALID, act })).toEqual({
      code: "INCOHERENT_DISTRIBUTION",
      question: "act",
    });
  });

  it("given a choice tied with the most probable option when validating then it is accepted", () => {
    const act = { type: "choice", choice: "GREET", probabilities: { TEASE: 0.5, GREET: 0.5 } };

    expect(validateAnswers(QUESTIONS, { ...VALID, act }).ok).toBe(true);
  });

  it("given a choice missing from its own distribution when validating then it fails closed", () => {
    const act = { type: "choice", choice: "GREET", probabilities: { TEASE: 0.9 } };

    expect(errorOf({ ...VALID, act })).toEqual({
      code: "INCOHERENT_DISTRIBUTION",
      question: "act",
    });
  });

  it("given a partial score distribution when validating then it is accepted", () => {
    const intensity = { type: "score", score: 9, probabilities: { "5": 0.3, "9": 0.6 } };

    expect(validateAnswers(QUESTIONS, { ...VALID, intensity }).ok).toBe(true);
  });

  it("given a score distribution on levels outside the ruler when validating then it fails closed", () => {
    const intensity = { type: "score", score: 5, probabilities: { "1": 0.5, "5": 0.5 } };

    expect(errorOf({ ...VALID, intensity })).toEqual({
      code: "UNKNOWN_OPTION",
      question: "intensity",
    });
  });

  it("given a score distribution that sums above 1.02 when validating then it fails closed", () => {
    const intensity = { type: "score", score: 5, probabilities: { "5": 0.6, "6": 0.6 } };

    expect(errorOf({ ...VALID, intensity })).toEqual({
      code: "INCOHERENT_DISTRIBUTION",
      question: "intensity",
    });
  });

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY], [1.01], [-0.01], ["0.5"]])(
    "given a noul of %s when validating then it fails closed",
    (noul) => {
      expect(errorOf({ ...VALID, isFalse: { type: "noul", noul } })).toEqual({
        code: "INVALID_ANSWER",
        question: "isFalse",
      });
    },
  );

  it.each([[1.99], [10.01], [Number.NaN]])(
    "given a score of %s when validating then it fails closed",
    (score) => {
      expect(errorOf({ ...VALID, intensity: { type: "score", score } })).toEqual({
        code: "INVALID_ANSWER",
        question: "intensity",
      });
    },
  );

  it.each([[1.5], [-0.1]])(
    "given a confidence of %s when validating then it fails closed",
    (confidence) => {
      const act = { type: "choice", choice: "TEASE", confidence };

      expect(errorOf({ ...VALID, act })).toEqual({ code: "INVALID_ANSWER", question: "act" });
    },
  );

  it("given an answer with an unknown field when validating then it fails closed", () => {
    const isFalse = { type: "noul", noul: 0.2, error: "refused" };

    expect(errorOf({ ...VALID, isFalse })).toEqual({ code: "INVALID_ANSWER", question: "isFalse" });
  });

  it("given a choice without probabilities when validating then the top comes from the confidence", () => {
    const result = validateAnswers(QUESTIONS, {
      ...VALID,
      act: { type: "choice", choice: "GREET", confidence: 0.64 },
    });

    expect(result).toMatchObject({ value: { act: { probabilities: {}, top: 6400 } } });
  });

  it("given a choice without probabilities or confidence when validating then the top is 0", () => {
    const result = validateAnswers(QUESTIONS, {
      ...VALID,
      act: { type: "choice", choice: "GREET" },
    });

    expect(result).toMatchObject({ value: { act: { top: 0 } } });
  });

  it("given a noul of 0.4 when validating then it reads as no", () => {
    const result = validateAnswers(QUESTIONS, { ...VALID, isFalse: { type: "noul", noul: 0.4 } });

    expect(result).toMatchObject({ value: { isFalse: { probability: 4000, yes: false } } });
  });

  it("given a score distribution on levels 2 and 10 when validating then it is accepted", () => {
    const intensity = { type: "score", score: 6, probabilities: { "2": 0.5, "10": 0.5 } };

    expect(validateAnswers(QUESTIONS, { ...VALID, intensity }).ok).toBe(true);
  });
});
