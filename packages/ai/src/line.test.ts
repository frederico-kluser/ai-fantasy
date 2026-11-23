import { describe, expect, it } from "vitest";

import { MAX_FALA_LENGTH, MAX_GESTO_LENGTH, validateLine } from "./line.ts";

const KNOWN = ["Otávio", "Maria Clara"];

function errorOf(raw: unknown): unknown {
  // The tests compare the error of a failed result; an ok result has none.
  return (validateLine(raw, KNOWN) as { error?: unknown }).error;
}

describe("validateLine (ai-integration §5.3)", () => {
  it("given a valid line when validating then it passes trimmed", () => {
    expect(validateLine({ fala: " Bom dia, Otávio! ", gesto: "acena " }, KNOWN)).toEqual({
      ok: true,
      value: { fala: "Bom dia, Otávio!", gesto: "acena" },
    });
  });

  it("given an empty gesture when validating then it passes", () => {
    expect(validateLine({ fala: "Pois não.", gesto: "" }, KNOWN).ok).toBe(true);
  });

  it("given only a gesture when validating then it passes", () => {
    expect(validateLine({ fala: "", gesto: "dá de ombros" }, KNOWN).ok).toBe(true);
  });

  it.each([
    [null],
    ["Bom dia"],
    [{ fala: "Oi" }],
    [{ fala: "Oi", gesto: "", extra: 1 }],
    [{ fala: 1, gesto: "" }],
  ])("given %j when validating then the schema rejects it", (raw) => {
    expect(errorOf(raw)).toEqual({ code: "SCHEMA", detail: "" });
  });

  it("given a blank fala and gesture when validating then it is rejected", () => {
    expect(errorOf({ fala: "  ", gesto: " " })).toEqual({ code: "EMPTY", detail: "" });
  });

  it("given a fala of 401 characters when validating then it is rejected", () => {
    expect(errorOf({ fala: "a".repeat(MAX_FALA_LENGTH + 1), gesto: "" })).toEqual({
      code: "TOO_LONG",
      detail: "fala",
    });
  });

  it("given a fala of 400 characters when validating then it passes", () => {
    expect(validateLine({ fala: "a".repeat(MAX_FALA_LENGTH), gesto: "" }, KNOWN).ok).toBe(true);
  });

  it("given a gesture of 121 characters when validating then it is rejected", () => {
    expect(errorOf({ fala: "Oi.", gesto: "a".repeat(MAX_GESTO_LENGTH + 1) })).toEqual({
      code: "TOO_LONG",
      detail: "gesto",
    });
  });

  it("given a fala of 400 accented characters when validating then length counts characters", () => {
    expect(validateLine({ fala: "é".repeat(MAX_FALA_LENGTH), gesto: "" }, KNOWN).ok).toBe(true);
  });

  it.each([
    ["Sua confiança está em 7300.", "7"],
    ["Tenho 3 moedas.", "3"],
    ["Uns setenta %, eu diria.", "%"],
    ["Isso vale mil bp.", "bp"],
    ["Mais um tick e vou.", "tick"],
    ["Faltam dois TICKS.", "TICKS"],
  ])("given %j when validating then mechanics are rejected", (fala, detail) => {
    expect(errorOf({ fala, gesto: "" })).toEqual({ code: "MECHANICS", detail });
  });

  it("given a digit in the gesture when validating then mechanics are rejected", () => {
    expect(errorOf({ fala: "Oi.", gesto: "dá 2 passos" })).toEqual({
      code: "MECHANICS",
      detail: "2",
    });
  });

  it("given a line with a name that is not known when validating then it is rejected", () => {
    expect(errorOf({ fala: "Ontem eu vi o Joaquim na feira.", gesto: "" })).toEqual({
      code: "UNKNOWN_NAME",
      detail: "Joaquim",
    });
  });

  it("given an unknown name in the gesture when validating then it is rejected", () => {
    expect(errorOf({ fala: "Oi.", gesto: "olha para Joaquim" })).toEqual({
      code: "UNKNOWN_NAME",
      detail: "Joaquim",
    });
  });

  it.each([
    ["Bom dia, Otávio!"],
    ["Você viu a Clara? Ela saiu."],
    ["Maria Clara chegou."],
    ["Fui lá. Depois voltei! Então? Nada… Enfim: Acabou."],
    ["— Vamos embora."],
    ['Ele disse: "Vamos".'],
    ["Graças a Deus, senhor. O Senhor é bom."],
    ["Dona Otávio e Seu Otávio, Sr. Otávio."],
    ["Eu sei. NÃO grite."],
    ["(Calma.) Tudo bem."],
  ])("given %j when validating then the capitalized words are accepted", (fala) => {
    expect(validateLine({ fala, gesto: "" }, KNOWN).ok).toBe(true);
  });

  it("given a sentence opening after a comma when validating then the capital is a name", () => {
    expect(errorOf({ fala: "Eu sei, Pedro.", gesto: "" })).toEqual({
      code: "UNKNOWN_NAME",
      detail: "Pedro",
    });
  });
});
