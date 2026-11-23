import { ACT_IDS } from "@ai-fantasy/engine";
import { describe, expect, it } from "vitest";

import { checkDecisionCall } from "./questions.ts";
import { buildPlayerLineCall, PLAYER_LINE_QUESTION_IDS } from "./player-line.ts";
import { person, playerLineInput, presets } from "../../test/fixtures.ts";

function optionsOf(id: string): string[] {
  const question = buildPlayerLineCall(playerLineInput(), presets()).questions[id];
  return Object.keys((question as { criteria: object }).criteria);
}

describe("buildPlayerLineCall (dialogue-acts §11)", () => {
  it("given a player line when building questions then the 10 questions go in a single call", () => {
    const call = buildPlayerLineCall(playerLineInput(), presets());

    expect(Object.keys(call.questions)).toEqual([...PLAYER_LINE_QUESTION_IDS]);
  });

  it("given a player line when building then the call follows the route rules", () => {
    const call = buildPlayerLineCall(playerLineInput(), presets());

    expect(checkDecisionCall(call).ok).toBe(true);
  });

  it("given the act question when building then its options are the 20 acts and OTHER", () => {
    expect(optionsOf("act")).toEqual([...ACT_IDS, "OTHER"]);
  });

  it("given the tone question when building then its options are the 6 tones", () => {
    expect(optionsOf("tone")).toEqual([
      "WARM",
      "NEUTRAL",
      "PLAYFUL",
      "SEDUCTIVE",
      "IRONIC",
      "AGGRESSIVE",
    ]);
  });

  it("given listeners out of order when building then the targets are sorted by id, then GROUP and NOBODY", () => {
    expect(optionsOf("target")).toEqual(["char_1", "char_4", "GROUP", "NOBODY"]);
  });

  it("given the topic type question when building then its options are the 8 types with speech", () => {
    expect(optionsOf("topicType")).toEqual([
      "PERSON",
      "THING",
      "PLACE",
      "EVENT",
      "SECRET",
      "RUMOR",
      "FEELING",
      "SMALL_TALK",
    ]);
  });

  it("given salient entities when building then the topic refs are them, then NONE and OTHER", () => {
    expect(optionsOf("topicRef")).toEqual(["ref_1", "ref_2", "NONE", "OTHER"]);
  });

  it("given the object question when building then its options are the 9 objects and NONE", () => {
    expect(optionsOf("object")).toHaveLength(10);
  });

  it("given the volume question when building then its options are the 3 volumes", () => {
    expect(optionsOf("volume")).toEqual(["WHISPER", "NORMAL", "SHOUT"]);
  });

  it("given known people when building then blamed options are them by id, then NONE", () => {
    expect(optionsOf("blamed")).toEqual(["char_1", "char_4", "char_7", "NONE"]);
  });

  it("given a listener when building then the target rubric is the name", () => {
    const question = buildPlayerLineCall(playerLineInput(), presets()).questions["target"];

    expect(question).toMatchObject({ criteria: { char_4: "Otávio" } });
  });

  it("given the intensity and isFalse questions when building then they are a score and a noul", () => {
    const { questions } = buildPlayerLineCall(playerLineInput(), presets());

    expect([questions["intensity"]?.type, questions["isFalse"]?.type]).toEqual(["score", "noul"]);
  });

  it("given 15 known facts when building then the state carries the first 12", () => {
    const facts = Array.from({ length: 15 }, (_, index) => `fact ${index}`);

    const call = buildPlayerLineCall(playerLineInput({ knownFacts: facts }), presets());

    expect(call.state).toMatchObject({ knownFacts: facts.slice(0, 12) });
  });

  it("given a player line when building then the state carries the line as typed and who is present", () => {
    const call = buildPlayerLineCall(playerLineInput(), presets());

    expect(call.state).toEqual({
      line: "Bom dia, Otávio!",
      speaker: "Lia",
      present: [
        { key: "char_1", name: "Bento" },
        { key: "char_4", name: "Otávio" },
      ],
      scene: "uma taverna à noite",
      knownFacts: ["Otávio deve dinheiro a Bento"],
      topics: [
        { key: "ref_1", description: "Otávio" },
        { key: "ref_2", description: "a dívida de Otávio" },
      ],
    });
  });

  it("given a session id when building then the call carries it", () => {
    const call = buildPlayerLineCall(playerLineInput({ sessionId: "s-1" }), presets());

    expect(call.sessionId).toBe("s-1");
  });

  it("given no session id when building then the call has none", () => {
    expect(buildPlayerLineCall(playerLineInput(), presets())).not.toHaveProperty("sessionId");
  });

  it("given a known person who also listens when building then blamed lists them once", () => {
    const input = playerLineInput({ people: [person(4, "Otávio"), person(4, "Otávio")] });

    const question = buildPlayerLineCall(input, presets()).questions["blamed"];

    expect(Object.keys((question as { criteria: object }).criteria)).toEqual(["char_4", "NONE"]);
  });
});
