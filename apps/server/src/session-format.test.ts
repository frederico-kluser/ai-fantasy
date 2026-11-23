import { describe, expect, it } from "vitest";

import { campaignDocument, sessionId, validateSlice } from "./session-format.ts";

const NOT_UTF8 = "Fatia inválida: o corpo não é texto UTF-8.";
const NO_FINAL_NEWLINE = "Fatia inválida: o JSONL tem de terminar com uma quebra de linha (\\n).";
const BAD_HEADER =
  "Fatia inválida: a primeira linha precisa de formatVersion inteiro maior ou igual a 1.";

function lineError(line: number): string {
  return `Fatia inválida: a linha ${String(line)} não é um objeto JSON.`;
}

describe("session ids (overview §8)", () => {
  it.each(["a", "1", "2", "2-b", "campaign-1", "0-", "a".repeat(64)])(
    "given the id %j when validating it then it is accepted",
    (id) => {
      expect(sessionId.safeParse(id)).toMatchObject({ success: true, data: id });
    },
  );

  it.each([
    "",
    "-a",
    "A",
    "Campaign",
    "a_b",
    "a.b",
    "a b",
    " a",
    "a/b",
    "a\\b",
    ".",
    "..",
    "../x",
    "..%2Fx",
    "ç",
    "a".repeat(65),
  ])("given the id %j when validating it then it is rejected", (id) => {
    expect(sessionId.safeParse(id).success).toBe(false);
  });

  it("given an id that is not a string when validating it then it is rejected", () => {
    expect(sessionId.safeParse(7).success).toBe(false);
  });
});

describe("campaign document (overview §8)", () => {
  it.each([{ formatVersion: 1 }, { formatVersion: 3, characters: [{ id: "c1" }], gapHours: 72 }])(
    "given the campaign %j when validating it then it is accepted as it is",
    (campaign) => {
      expect(campaignDocument.safeParse(campaign)).toMatchObject({
        success: true,
        data: campaign,
      });
    },
  );

  it.each([
    {},
    { formatVersion: 0 },
    { formatVersion: -1 },
    { formatVersion: 1.5 },
    { formatVersion: "1" },
    { formatVersion: 9_007_199_254_740_992 },
    [],
    null,
    "campaign",
  ])("given the campaign %j when validating it then it is rejected", (campaign) => {
    expect(campaignDocument.safeParse(campaign).success).toBe(false);
  });
});

describe("slice JSONL (overview §8)", () => {
  it.each([
    ["a header only", '{"formatVersion":1}\n'],
    ["a header and entries", '{"formatVersion":1,"seed":7}\n{"kind":"PLAYER_ACT"}\n{"n":2}\n'],
    ["accents and emoji", '{"formatVersion":2}\n{"line":"Olá, ação! ☕ 🙂"}\n'],
    ["CRLF line ends", '{"formatVersion":1}\r\n{"n":1}\r\n'],
    ["spaces around the objects", ' {"formatVersion":1} \n\t{"n":1}\n'],
  ])("given a slice with %s when validating it then the same bytes are accepted", (_case, text) => {
    const body = Buffer.from(text, "utf8");

    const result = validateSlice(body);

    expect(result).toEqual({ ok: true, value: body });
  });

  it.each([
    ["no body", undefined],
    ["a string instead of bytes", '{"formatVersion":1}\n'],
  ])("given %s when validating a slice then it is not UTF-8 bytes", (_case, body) => {
    expect(validateSlice(body)).toEqual({ ok: false, error: NOT_UTF8 });
  });

  it("given bytes that are not UTF-8 when validating a slice then it is rejected", () => {
    const body = Buffer.concat([
      Buffer.from('{"formatVersion":1,"x":"'),
      Buffer.from([0xff]),
      Buffer.from('"}\n'),
    ]);

    expect(validateSlice(body)).toEqual({ ok: false, error: NOT_UTF8 });
  });

  it.each([
    ["an empty body", ""],
    ["no newline after the last line", '{"formatVersion":1}\n{"n":1}'],
  ])("given %s when validating a slice then the final newline is missing", (_case, text) => {
    expect(validateSlice(Buffer.from(text))).toEqual({ ok: false, error: NO_FINAL_NEWLINE });
  });

  it.each([
    ["an empty line", '{"formatVersion":1}\n\n{"n":1}\n', 2],
    ["invalid JSON", '{"formatVersion":1}\n{"n":1}\n{n:1}\n', 3],
    ["an array", '{"formatVersion":1}\n[1,2]\n', 2],
    ["a number", '{"formatVersion":1}\n7\n', 2],
    ["null", '{"formatVersion":1}\nnull\n', 2],
    ["a string", '{"formatVersion":1}\n"text"\n', 2],
    ["a header that is not an object", "[]\n", 1],
    ["only a newline", "\n", 1],
    ["a byte order mark", '﻿{"formatVersion":1}\n', 1],
  ])(
    "given a line with %s when validating a slice then that line is reported",
    (_case, text, line) => {
      expect(validateSlice(Buffer.from(text))).toEqual({ ok: false, error: lineError(line) });
    },
  );

  it.each([
    ['{"seed":1}\n'],
    ['{"formatVersion":0}\n'],
    ['{"formatVersion":1.5}\n'],
    ['{"formatVersion":"1"}\n'],
    ['{"n":1}\n{"formatVersion":1}\n'],
  ])(
    "given the header line of %j when validating a slice then the format version is reported",
    (text) => {
      expect(validateSlice(Buffer.from(text))).toEqual({ ok: false, error: BAD_HEADER });
    },
  );
});
