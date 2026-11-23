import { PRESETS_VERSION } from "@ai-fantasy/engine";
import { describe, expect, it } from "vitest";

import { SEEDS } from "../../test/support.ts";
import {
  castInputOf,
  formProblems,
  initialPlayground,
  newCharacter,
  sceneSetupOf,
  type PlaygroundState,
} from "./model.ts";

const EMPTY = initialPlayground({ ...SEEDS });

function withCast(fields: Partial<PlaygroundState>): PlaygroundState {
  return {
    ...EMPTY,
    characters: [
      { ...newCharacter("caretaker"), name: " Ana " },
      { ...newCharacter("rebel"), name: "Bruno" },
    ],
    ...fields,
  };
}

describe("formProblems", () => {
  it("given the manual form with no character when submitting then validation explains what is missing", () => {
    expect(formProblems(EMPTY)).toStrictEqual([
      { path: "cast.characters", message: "Adicione pelo menos um personagem ao elenco." },
    ]);
  });

  it("given a character without a name when submitting then validation asks for its name", () => {
    const state = withCast({
      characters: [{ ...newCharacter("elder"), name: "Rosa" }, newCharacter("child")],
    });

    expect(formProblems(state)).toStrictEqual([
      { path: "cast.characters.1.identity.name", message: "Dê um nome ao personagem 2." },
    ]);
  });

  it("given a name of spaces only when submitting then it counts as missing", () => {
    const state = withCast({ characters: [{ ...newCharacter("elder"), name: "   " }] });

    expect(formProblems(state)).toHaveLength(1);
  });

  it("given every character named when submitting then nothing is missing", () => {
    expect(formProblems(withCast({}))).toStrictEqual([]);
  });
});

describe("initialPlayground", () => {
  it("given seeds when starting then the form is a clear evening in a social interior with no one", () => {
    expect(EMPTY).toStrictEqual({
      seeds: SEEDS,
      attempt: 0,
      place: "social_interior",
      grid: "social_interior",
      naturalTag: null,
      weather: "clear",
      startMinute: 1200,
      characters: [],
      bonds: [],
      derived: [],
      positions: [],
      player: null,
      revision: 0,
      generated: null,
    });
  });

  it("given an archetype when making a new character then every choice is at its default", () => {
    expect(newCharacter("scholar")).toStrictEqual({
      archetype: "scholar",
      name: "",
      pronouns: "",
      role: "",
      description: "",
      ageBand: "ADULT",
      speechRegister: "COLLOQUIAL",
      dayState: "rested",
      drives: [null, null],
      association: null,
      locked: null,
    });
  });
});

describe("castInputOf", () => {
  it("given the form when building the cast input then identity, choices, bonds and attempt are carried", () => {
    const state = withCast({
      attempt: 2,
      characters: [
        {
          ...newCharacter("caretaker"),
          name: " Ana ",
          pronouns: "ela",
          role: "dona",
          description: "calma",
          ageBand: "ELDER",
          speechRegister: "RUSTIC",
          dayState: "tired",
          drives: ["fun", "fun"],
          association: { tag: "water", kind: "FEAR" },
        },
      ],
      bonds: [
        { a: 0, b: 1, archetype: "rivals", events: [{ event: "stole", author: 1 }], locked: null },
      ],
    });

    expect(castInputOf(state)).toStrictEqual({
      attempt: 2,
      characters: [
        {
          archetype: "caretaker",
          identity: {
            name: "Ana",
            pronouns: "ela",
            role: "dona",
            description: "calma",
            ageBand: "ELDER",
            speechRegister: "RUSTIC",
          },
          dominantDrives: ["fun"],
          dayState: "tired",
          association: { tag: "water", kind: "FEAR" },
          locked: null,
        },
      ],
      bonds: [
        { a: 0, b: 1, archetype: "rivals", events: [{ event: "stole", author: 1 }], locked: null },
      ],
      derived: [],
    });
  });

  it("given a derived pair locked when building the cast input then its lock is carried", () => {
    const locked = { aToB: {}, bToA: {}, secrets: [] } as never;

    expect(castInputOf(withCast({ derived: [{ a: 0, b: 2, locked }] })).derived).toStrictEqual([
      { a: 0, b: 2, locked },
    ]);
  });

  it("given a drive picked second only when building then it is the one pick", () => {
    const state = withCast({
      characters: [{ ...newCharacter("elder"), name: "R", drives: [null, "care"] }],
    });

    expect(castInputOf(state).characters[0]?.dominantDrives).toStrictEqual(["care"]);
  });
});

describe("sceneSetupOf", () => {
  it("given the form when building the setup then the scene choices and the presets version are carried", () => {
    const state = withCast({
      place: "wilderness",
      grid: "makeshift_shelter",
      naturalTag: "forest",
      weather: "fog",
      startMinute: 180,
      positions: [{ x: 1, y: 2 }, null, { x: 3, y: 3 }],
      player: 1,
    });

    expect(sceneSetupOf(state)).toStrictEqual({
      version: 1,
      presetsVersion: PRESETS_VERSION,
      seeds: SEEDS,
      cast: castInputOf(state),
      place: "wilderness",
      grid: "makeshift_shelter",
      naturalTag: "forest",
      weather: "fog",
      startMinute: 180,
      positions: [{ x: 1, y: 2 }, null],
      player: 1,
    });
  });
});
