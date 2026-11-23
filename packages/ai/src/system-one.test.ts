import { describe, expect, it } from "vitest";

import { createFakeSystemOne, FAKE_USAGE } from "./fakes.ts";
import { readPlayerLine } from "./system-one.ts";
import { charId, playerLineInput, presets } from "../test/fixtures.ts";

const TEASE_OTAVIO = {
  act: { type: "choice", choice: "TEASE", probabilities: { TEASE: 0.8, CHAT: 0.2 } },
  tone: { type: "choice", choice: "PLAYFUL" },
  target: { type: "choice", choice: "char_4", probabilities: { char_4: 0.9, GROUP: 0.1 } },
  topicType: { type: "choice", choice: "PERSON" },
  topicRef: { type: "choice", choice: "ref_1" },
  intensity: { type: "score", score: 6 },
};

describe("readPlayerLine (overview §4)", () => {
  it("given a scripted fake when reading a player line then the reading comes out", async () => {
    const result = await readPlayerLine(
      createFakeSystemOne({ answers: TEASE_OTAVIO }),
      playerLineInput(),
      presets(),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        reading: {
          act: "TEASE",
          confidence: 8000,
          needsConfirmation: false,
          candidate: { tone: "PLAYFUL", targets: [charId(4)], intensity: 5000 },
        },
        usage: FAKE_USAGE,
      },
    });
  });

  it("given a player line when reading then the port gets one call with the 10 questions", async () => {
    const fake = createFakeSystemOne({ answers: TEASE_OTAVIO });

    await readPlayerLine(fake, playerLineInput(), presets());

    expect(fake.calls.map((call) => Object.keys(call.questions).length)).toEqual([10]);
  });

  it("given a failing port when reading then the failure comes back", async () => {
    const fake = createFakeSystemOne({ failure: { kind: "MISSING_KEY" } });

    const result = await readPlayerLine(fake, playerLineInput(), presets());

    expect(result).toEqual({ ok: false, error: { kind: "MISSING_KEY" } });
  });

  it("given invalid answers when reading then it fails closed with the problem", async () => {
    const fake = createFakeSystemOne({ answers: { act: { type: "choice", choice: "DANCE" } } });

    const result = await readPlayerLine(fake, playerLineInput(), presets());

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "INVALID_ANSWERS",
        error: { code: "UNKNOWN_OPTION", question: "act" },
        usage: FAKE_USAGE,
      },
    });
  });
});
