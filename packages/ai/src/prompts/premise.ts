/**
 * The SOM questions that map a premise to presets (presets §10, ai-integration
 * §4.3): one scene call, character calls (7 questions each, 2 characters per
 * call) and bond calls (5 questions per pair, 3 pairs per call, every pair of
 * characters with a line). Reading the answers into a sheet belongs to AI-04.
 */
import { DAY_PHASES, type Presets } from "@ai-fantasy/engine";

import { bare, catalogOptions, optionsFrom, type Options } from "./options.ts";
import type { DecisionCall, JsonValue, Question, QuestionEntry } from "./questions.ts";

/** The premise and the optional character lines the user typed (presets §10 step 1). */
export interface PremiseInput {
  readonly premise: string;
  /** One line per character, up to 8. */
  readonly characterLines: readonly string[];
  readonly sessionId?: string;
}

/** Characters per character call (presets §10 step 3). */
export const CHARACTERS_PER_CALL = 2;

/** Pairs per bond call (presets §10 step 4). */
export const BOND_PAIRS_PER_CALL = 3;

/** Age bands (presets §10 step 3; presentation only). */
export const AGE_BANDS = ["CHILD", "TEEN", "YOUNG", "ADULT", "ELDER"] as const;

/** Speech registers (presets §10 step 3; presentation only). */
export const SPEECH_REGISTERS = ["FORMAL", "COLLOQUIAL", "RUSTIC", "CULTURED", "ARCHAIC"] as const;

const REGISTER_NAMES: Options = {
  FORMAL: "formal",
  COLLOQUIAL: "coloquial",
  RUSTIC: "rústico",
  CULTURED: "culto",
  ARCHAIC: "arcaico",
};

function choice(instructions: string, criteria: Options): Question {
  return { type: "choice", instructions, criteria };
}

function withSession(call: DecisionCall, input: PremiseInput): DecisionCall {
  return input.sessionId === undefined ? call : { ...call, sessionId: input.sessionId };
}

function batches<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function sceneQuestions(input: PremiseInput, presets: Presets): QuestionEntry[] {
  const entries: QuestionEntry[] = [
    [
      "place",
      choice("Where does the scene happen?", {
        ...catalogOptions(presets.places),
        OTHER: "none of these",
      }),
    ],
    [
      "naturalTag",
      choice("What natural feature marks the place?", {
        ...catalogOptions(presets.associationTags),
        NONE: "none",
      }),
    ],
    ["weather", choice("What is the weather?", catalogOptions(presets.weathers))],
    ["dayPhase", choice("What time of day does the scene start?", bare(DAY_PHASES))],
    [
      "playerPresent",
      { type: "noul", instructions: "Is the player one of the people in the scene?" },
    ],
  ];
  const count: QuestionEntry = [
    "characterCount",
    choice("How many people are in the scene?", bare(["2", "3", "4", "5", "6", "7", "8"])),
  ];
  return input.characterLines.length === 0 ? [...entries, count] : entries;
}

/** Builds the scene call: 6 questions, or 5 when there are character lines. */
export function buildSceneCall(input: PremiseInput, presets: Presets): DecisionCall {
  const state = { premise: input.premise, characters: [...input.characterLines] };
  return withSession(
    { state, questions: Object.fromEntries(sceneQuestions(input, presets)) },
    input,
  );
}

function associationOptions(presets: Presets): Options {
  const options = presets.associationTags.flatMap(({ id, name }): [string, string][] => [
    [`fear_${id}`, `medo de ${name}`],
    [`attachment_${id}`, `apego a ${name}`],
  ]);
  return { ...optionsFrom(options), NONE: "none" };
}

function characterQuestions(index: number, presets: Presets): QuestionEntry[] {
  const drives = { ...catalogOptions(presets.drives), NONE: "none" };
  const questions: QuestionEntry[] = [
    [
      "archetype",
      choice("Which archetype fits this person best?", catalogOptions(presets.characterArchetypes)),
    ],
    ["ageBand", choice("How old is this person?", bare(AGE_BANDS))],
    ["drive1", choice("What does this person want most?", drives)],
    ["drive2", choice("What does this person want second most?", drives)],
    ["dayState", choice("How is this person today?", catalogOptions(presets.dayStates))],
    [
      "association",
      choice("What does this person fear or hold dear?", associationOptions(presets)),
    ],
    ["register", choice("How does this person speak?", REGISTER_NAMES)],
  ];
  return questions.map(([id, question]) => [`c${index}.${id}`, question]);
}

/** Builds the character calls: 7 questions per character, 2 characters per call. */
export function buildCharacterCalls(input: PremiseInput, presets: Presets): DecisionCall[] {
  const characters = input.characterLines.map((line, index) => ({ index, line }));
  return batches(characters, CHARACTERS_PER_CALL).map((batch) => {
    const characters = batch.map(({ index, line }) => ({ key: `c${index}`, line }));
    const questions = batch.flatMap(({ index }) => characterQuestions(index, presets));
    return withSession(
      { state: { premise: input.premise, characters }, questions: Object.fromEntries(questions) },
      input,
    );
  });
}

function bondOptions(presets: Presets): Options {
  const options = presets.bondArchetypes.flatMap(({ id, name, directional }): [string, string][] =>
    directional
      ? [
          [`${id}.ab`, `${name}; A is the first person`],
          [`${id}.ba`, `${name}; A is the second person`],
        ]
      : [[id, name]],
  );
  return optionsFrom(options);
}

function pairQuestions(key: string, presets: Presets): QuestionEntry[] {
  const events = { ...catalogOptions(presets.historyEvents), NONE: "nothing notable" };
  const by = { FIRST: "the first person of the pair", SECOND: "the second person of the pair" };
  const questions: QuestionEntry[] = [
    ["bond", choice("What is the bond between the two?", bondOptions(presets))],
    ["event1", choice("What is the most important thing that happened between them?", events)],
    ["event1By", choice("Who did it?", by)],
    ["event2", choice("What else important happened between them?", events)],
    ["event2By", choice("Who did it?", by)],
  ];
  return questions.map(([id, question]) => [`${key}.${id}`, question]);
}

interface Pair {
  readonly key: string;
  readonly first: string;
  readonly second: string;
}

function pairs(lines: readonly string[]): Pair[] {
  return lines.flatMap((first, a) =>
    lines.slice(a + 1).map((second, offset) => ({ key: `p${a}_${a + 1 + offset}`, first, second })),
  );
}

/** Builds the bond calls: every pair of characters, 5 questions per pair, 3 pairs per call. */
export function buildBondCalls(input: PremiseInput, presets: Presets): DecisionCall[] {
  return batches(pairs(input.characterLines), BOND_PAIRS_PER_CALL).map((batch) => {
    const state: JsonValue = { premise: input.premise, pairs: batch.map((pair) => ({ ...pair })) };
    const questions = batch.flatMap((pair) => pairQuestions(pair.key, presets));
    return withSession({ state, questions: Object.fromEntries(questions) }, input);
  });
}
