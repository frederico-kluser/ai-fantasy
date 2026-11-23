/**
 * The 10 SOM questions that read a player line as an act (dialogue-acts §11,
 * ai-integration §4.3), always in a single call. Instructions are in English
 * (ai-integration §4.1: start in English and compare in AI-02); option rubrics
 * are the catalog names.
 */
import {
  compareIds,
  VOLUMES,
  type CharacterId,
  type Presets,
  type Topic,
} from "@ai-fantasy/engine";

import { bare, catalogOptions, intensityCriteria, optionsFrom, type Options } from "./options.ts";
import type { DecisionCall, JsonValue, Question } from "./questions.ts";

/** A person by id and name; the name is presentation and only goes to the model. */
export interface Person {
  readonly id: CharacterId;
  readonly name: string;
}

/** Something the player's character knows that a line can be about (a `topicRef` option). */
export interface SalientEntity {
  /** How the model reads it: a name, an object, a fact in words. */
  readonly description: string;
  /** The topic it stands for; its `type` must match the `topicType` read. */
  readonly topic: Topic;
}

/** What the SOM needs to read a player line (ai-integration §4.3). */
export interface PlayerLineInput {
  /** The line as the player typed it. */
  readonly line: string;
  /** The name of the player's character. */
  readonly speaker: string;
  /** Who hears the line: the `target` options. */
  readonly listeners: readonly Person[];
  /** The scene in words. */
  readonly scene: string;
  /** Facts the player's character knows, most salient first; only the first 12 go. */
  readonly knownFacts: readonly string[];
  /** The `topicRef` options, in this order. */
  readonly entities: readonly SalientEntity[];
  /** People the player's character knows: the `blamed` options. */
  readonly people: readonly Person[];
  /** The session the call belongs to. */
  readonly sessionId?: string;
}

/** The question ids, in the order of dialogue-acts §11. */
export const PLAYER_LINE_QUESTION_IDS = [
  "act",
  "tone",
  "target",
  "topicType",
  "topicRef",
  "object",
  "intensity",
  "volume",
  "isFalse",
  "blamed",
] as const;

/** Id of a player-line question. */
export type PlayerLineQuestionId = (typeof PLAYER_LINE_QUESTION_IDS)[number];

/** Most known facts in the state (ai-integration §4.3). */
export const MAX_KNOWN_FACTS = 12;

/** The option key of a character in `target` and `blamed`. */
export function characterKey(id: CharacterId): string {
  return `char_${id}`;
}

/** The option key of the entity at `index` (0-based) in `topicRef`. */
export function entityKey(index: number): string {
  return `ref_${index + 1}`;
}

/** People by increasing id (a repeated id becomes one option: option keys are unique). */
export function byId(people: readonly Person[]): Person[] {
  return [...people].sort((a, b) => compareIds(a.id, b.id));
}

function peopleOptions(people: readonly Person[]): Options {
  return optionsFrom(byId(people).map(({ id, name }) => [characterKey(id), name]));
}

function choice(instructions: string, criteria: Options): Question {
  return { type: "choice", instructions, criteria };
}

type ActQuestionId = Exclude<PlayerLineQuestionId, "target" | "topicRef" | "blamed">;

/** The questions that only depend on the catalogs. */
function actQuestions(presets: Presets): Record<ActQuestionId, Question> {
  const speech = presets.topicTypes.filter(({ id }) => id !== "NONE");
  return {
    act: choice("What does the speaker do with this line?", {
      ...catalogOptions(presets.acts),
      OTHER: "none of these",
    }),
    tone: choice("In what tone is the line said?", catalogOptions(presets.tones)),
    topicType: choice("What kind of thing is the line about?", catalogOptions(speech)),
    object: choice("If the speaker asks for or offers something, what is it?", {
      ...catalogOptions(presets.requestObjects),
      NONE: "nothing is asked for or offered",
    }),
    intensity: {
      type: "score",
      instructions: "How strong is the line?",
      criteria: intensityCriteria(),
    },
    volume: choice("How loud is the line said?", bare(VOLUMES)),
    isFalse: {
      type: "noul",
      instructions: "Does the line state as true something that contradicts the known facts?",
    },
  };
}

/** The questions whose options are the people and the topics of the scene. */
function sceneQuestions(
  input: PlayerLineInput,
): Record<Exclude<PlayerLineQuestionId, ActQuestionId>, Question> {
  const entities = input.entities.map(
    ({ description }, index) => [entityKey(index), description] as const,
  );
  return {
    target: choice("Who is the line addressed to?", {
      ...peopleOptions(input.listeners),
      GROUP: "everyone who hears it",
      NOBODY: "nobody in particular",
    }),
    topicRef: choice("Which of the listed topics is the line about?", {
      ...optionsFrom(entities),
      NONE: "no particular topic",
      OTHER: "something not listed",
    }),
    blamed: choice("If the line is a lie, who does it blame?", {
      ...peopleOptions(input.people),
      NONE: "nobody",
    }),
  };
}

function questions(input: PlayerLineInput, presets: Presets): Record<string, Question> {
  const all: Record<PlayerLineQuestionId, Question> = {
    ...actQuestions(presets),
    ...sceneQuestions(input),
  };
  return Object.fromEntries(PLAYER_LINE_QUESTION_IDS.map((id) => [id, all[id]] as const));
}

function state(input: PlayerLineInput): JsonValue {
  return {
    line: input.line,
    speaker: input.speaker,
    present: byId(input.listeners).map(({ id, name }) => ({ key: characterKey(id), name })),
    scene: input.scene,
    knownFacts: input.knownFacts.slice(0, MAX_KNOWN_FACTS),
    topics: input.entities.map(({ description }, index) => ({
      key: entityKey(index),
      description,
    })),
  };
}

/**
 * Builds the single call that reads a player line: the 10 questions of
 * dialogue-acts §11 and the compact state (the line as typed, who is present,
 * the scene and at most 12 known facts).
 */
export function buildPlayerLineCall(input: PlayerLineInput, presets: Presets): DecisionCall {
  const call = { state: state(input), questions: questions(input, presets) };
  return input.sessionId === undefined ? call : { ...call, sessionId: input.sessionId };
}
