/**
 * Test support for the decision and turns modules: a decision scene built from
 * a few overrides. The default is an open 25 × 25 floor grid with no noise,
 * day sight and no present tags, an empty record and no obligations.
 */
import fc from "fast-check";

import type { Obligation } from "../../src/acts/obligations.ts";
import { createCopy, type FactCopy } from "../../src/memory/copy.ts";
import type { Fact } from "../../src/memory/fact.ts";
import type { CharacterState } from "../../src/character/state.ts";
import type { DecisionScene } from "../../src/decision/scene.ts";
import type { Candidate } from "../../src/decision/utility.ts";
import { toBp } from "../../src/domain/bp.ts";
import type { CharacterId, FactId } from "../../src/domain/ids.ts";
import type { ActLabel, ActTargets, Topic } from "../../src/acts/label.ts";
import {
  aboutFact,
  aHistoryFact,
  aLabel,
  anActFact,
  defaultObjects,
  defaultRules,
  ids,
} from "./acts.ts";
import { arbitraryCharacter } from "./character.ts";
import { openGrid } from "./context.ts";

const RULES = defaultRules();
const OBJECTS = defaultObjects();

/** A decision scene of `author` with the overrides given (see the module comment). */
export function aDecisionScene(
  author: CharacterState,
  overrides: Partial<Omit<DecisionScene, "author">> = {},
): DecisionScene {
  return {
    rules: RULES,
    objects: OBJECTS,
    grid: openGrid(25),
    now: { noise: toBp(0), vision: 20, presentTags: [] },
    author,
    others: [],
    facts: [],
    sliceStart: 0,
    obligations: [],
    bands: [],
    ...overrides,
  };
}

/** A candidate that answers nothing, from label overrides. */
export function aCandidate(overrides: Partial<ActLabel> = {}, answers = false): Candidate {
  return { label: aLabel(overrides), answers };
}

/** An obligation of `debtor` to answer the act `fact` of `creditor`, made at tick 0. */
export function anObligation(
  debtor: number,
  creditor: number,
  fact: number,
  act: Obligation["act"],
  topic: Topic,
): Obligation {
  return {
    debtor: debtor as CharacterId,
    creditor: creditor as CharacterId,
    fact: fact as FactId,
    act,
    topic,
    tick: 0,
  };
}

const SCENE_SIDE = 9;
const PEOPLE = [0, 1, 2, 3] as const;
const SPEECH: readonly ActLabel["act"][] = ["GREET", "CHAT", "ASK", "ACCUSE", "TELL"];

/** Random history facts 0..`count − 1` among the people of the scene. */
function arbitraryHistory(count: number): fc.Arbitrary<Fact[]> {
  const person = fc.constantFrom(...PEOPLE);
  const fact = fc.record({
    author: person,
    subject: person,
    offenders: fc.uniqueArray(person, { maxLength: 2 }),
    secret: fc.boolean(),
  });
  return fc
    .array(fact, { minLength: count, maxLength: count })
    .map((drawn) =>
      drawn.map(({ author, subject, offenders, secret }, id) =>
        aHistoryFact(id, author, subject, { offenders: ids(...offenders.sort()), secret }),
      ),
    );
}

/** Random acts that follow the history, some about its facts. */
function arbitraryActs(first: number, history: number): fc.Arbitrary<Fact[]> {
  const person = fc.constantFrom(...PEOPLE);
  const topic = fc.oneof(
    person.map((id): Topic => ({ type: "PERSON", person: id as CharacterId })),
    fc.integer({ min: 0, max: history - 1 }).map((id) => aboutFact("EVENT", id)),
    fc.constant<Topic>({ type: "SMALL_TALK" }),
  );
  const act = fc.record({
    author: person,
    act: fc.constantFrom(...SPEECH),
    targets: fc.oneof(
      person.map((id): ActTargets => ids(id)),
      fc.constant<ActTargets>("GROUP"),
    ),
    topic,
  });
  return fc
    .array(act, { maxLength: 4 })
    .map((drawn) =>
      drawn.map(({ author, ...label }, index) => anActFact(first + index, author, aLabel(label))),
    );
}

/** Random copies of the facts given. */
function arbitraryMemories(facts: readonly Fact[]): fc.Arbitrary<FactCopy[]> {
  const copy = (fact: Fact) =>
    fc
      .record({
        held: fc.boolean(),
        importance: fc.integer({ min: 0, max: 10000 }),
        told: fc.boolean(),
        falseOffenders: fc.option(fc.uniqueArray(fc.constantFrom(...PEOPLE), { maxLength: 1 })),
      })
      .map(({ held, importance, told, falseOffenders }) =>
        held
          ? [
              createCopy(
                fact.id,
                told
                  ? { perspective: "TOLD", tellerFidelity: toBp(8000) }
                  : { perspective: "DIRECT" },
                toBp(importance),
                falseOffenders === null ? null : ids(...falseOffenders),
              ),
            ]
          : [],
      );
  return fc.tuple(...facts.map(copy)).map((lists) => lists.flat());
}

/** A random person `id` at its drawn cell, holding random copies of `facts`. */
function arbitraryPerson(id: number, cells: readonly number[], facts: readonly Fact[]) {
  const others = PEOPLE.filter((other) => other !== id);
  return fc
    .tuple(arbitraryCharacter(id, cells[id] ?? 0, others), arbitraryMemories(facts))
    .map(([character, memories]) => ({ ...character, memories }));
}

/** A random scene of character 1 over a record and the people present. */
function sceneOver(cells: readonly number[], present: readonly number[], facts: readonly Fact[]) {
  return fc
    .record({
      author: arbitraryPerson(1, cells, facts),
      others: fc.tuple(...present.map((id) => arbitraryPerson(id, cells, facts))),
      sliceStart: fc.integer({ min: 0, max: facts.length }),
      tags: fc.subarray(["forest", "dark"] as const),
    })
    .map(({ author, others, sliceStart, tags }) =>
      aDecisionScene(author, {
        grid: openGrid(SCENE_SIDE),
        now: { noise: toBp(0), vision: 20, presentTags: tags },
        others,
        facts,
        sliceStart,
      }),
    );
}

/**
 * A random decision scene of character 1 on an open 9 × 9 grid, with 0 to 3
 * others (ids 0, 2 and 3) at distinct cells, random states, a random record
 * with copies, and no obligations.
 */
export function arbitraryDecisionScene(): fc.Arbitrary<DecisionScene> {
  const cells = fc.uniqueArray(fc.integer({ min: 0, max: SCENE_SIDE * SCENE_SIDE - 1 }), {
    minLength: 4,
    maxLength: 4,
  });
  return fc
    .record({ cells, present: fc.subarray([0, 2, 3]), count: fc.integer({ min: 1, max: 3 }) })
    .chain(({ cells: drawn, present, count }) =>
      fc
        .tuple(arbitraryHistory(count), arbitraryActs(count, count))
        .chain(([history, acts]) => sceneOver(drawn, present, [...history, ...acts])),
    );
}
