/**
 * Recording an act (simulation-model §12, §16 sub-step 5.4): the act becomes a
 * fact with the next sequential id and the real label; the author and everyone
 * who perceived it keep a copy with their perspective; a `TELL` about a fact
 * gives a `TOLD` copy to each `DIRECT` hearer without one and brings the
 * teller's copy back to its highest fidelity.
 *
 * The offenders of the fact and the importance of each copy come from the
 * appraisal (SOC-03). Until it runs, a fact has no offenders and is not secret,
 * and a copy has the neutral importance of {@link neutralImportance}: 3000 for
 * whoever is in the fact (author, target or topic), 0 for the others.
 */
import type { ActLabel, ActTargets, OutcomeBand } from "../acts/label.ts";
import type { ActPerspective, Perceived } from "../acts/perspectives.ts";
import type { CharacterState } from "../character/state.ts";
import type { Bp } from "../domain/bp.ts";
import type { CharacterId, FactId } from "../domain/ids.ts";
import { createCopy, factImportance, retell, type FactCopy } from "./copy.ts";
import type { ActFact, Fact } from "./fact.ts";

/** An act to record. */
export interface RecordInput {
  /** The record so far, in increasing id order. */
  readonly facts: readonly Fact[];
  /** The tick when the act was resolved. */
  readonly tick: number;
  readonly author: CharacterId;
  /** The real label of the act (a valid one). */
  readonly label: ActLabel;
  /** Who perceived the act and how, in increasing id order (see `perceiveAct`). */
  readonly perceived: readonly Perceived[];
  /** The characters present, the author included. */
  readonly characters: readonly CharacterState[];
  /** What the appraisal (SOC-03) found; without it, the neutral values below. */
  readonly appraisal?: RecordAppraisal;
}

/** The importance of the new fact for one character. */
export interface CharacterImportance {
  readonly id: CharacterId;
  readonly importance: Bp;
}

/**
 * What the appraisal (SOC-03) adds to the record. Every field is optional and
 * defaults to the neutral value: no offenders, the importance of
 * {@link neutralImportance}, no belief decided (every `TOLD` copy carries the
 * teller's version) and no outcome band.
 */
export interface RecordAppraisal {
  /** The offenders of the new fact, sorted by id (default `[]`). */
  readonly offenders?: readonly CharacterId[];
  /** The importance of the new fact for some characters; the others keep the neutral one. */
  readonly importances?: readonly CharacterImportance[];
  /**
   * In a lie (`TELL` with `isFalse` about a fact), the `DIRECT` hearers without a
   * copy who believed it: they get the `TOLD` copy of the false version (the
   * `blamed` person as offender, or nobody); the others get no `TOLD` copy.
   * Absent: belief is not decided yet and every `TOLD` copy carries the teller's version.
   */
  readonly believers?: readonly CharacterId[];
  /** The outcome band of a request this act answers (dialogue-acts §8.2; default none). */
  readonly band?: OutcomeBand | null;
}

/** The recorded act: the new fact, the record with it, and the characters with their copies. */
export interface Recorded {
  readonly fact: ActFact;
  readonly facts: readonly Fact[];
  readonly characters: readonly CharacterState[];
}

/** The id of the next fact: one above the highest, 0 for an empty record (simulation-model §12). */
export function nextFactId(facts: readonly Fact[]): FactId {
  const highest = facts.reduce((top, fact) => Math.max(top, fact.id), -1);
  // One above an id (or 0) is again a safe integer ≥ 0.
  return (highest + 1) as FactId;
}

/**
 * Who an act is addressed to: its targets, or every `DIRECT` hearer when it is
 * addressed to the `GROUP` (dialogue-acts §5).
 */
export function addressees(targets: ActTargets, perceived: readonly Perceived[]): CharacterId[] {
  return targets === "GROUP"
    ? perceived.filter((seen) => seen.perspective === "DIRECT").map((seen) => seen.id)
    : [...targets];
}

/**
 * Whether `id` is in the fact (simulation-model §12, importance): the author,
 * a target or the person of the topic of an act; either side of a history
 * event. `perceived` resolves a `GROUP` act; pass `[]` for an old fact.
 */
export function involvedIn(fact: Fact, id: CharacterId, perceived: readonly Perceived[]): boolean {
  if (fact.kind === "HISTORY") {
    return fact.author === id || fact.subject === id;
  }
  const { topic, targets } = fact.label;
  const aboutThem = topic.type === "PERSON" && topic.person === id;
  return fact.author === id || aboutThem || addressees(targets, perceived).includes(id);
}

/** The importance before the appraisal: 3000 if involved, else 0 (simulation-model §12). */
export function neutralImportance(involved: boolean): Bp {
  return factImportance({ emotionDeltas: [], bondDeltas: [], involved });
}

/** The memories with `copy`, sorted by fact id; a copy of the same fact is replaced. */
export function withCopy(memories: readonly FactCopy[], copy: FactCopy): FactCopy[] {
  return [...memories.filter((held) => held.fact !== copy.fact), copy].sort(
    (a, b) => a.fact - b.fact,
  );
}

function copyOf(memories: readonly FactCopy[], fact: FactId): FactCopy | undefined {
  return memories.find((held) => held.fact === fact);
}

/** The fact a `TELL` is about, with the teller's copy, or `null` when it tells no fact. */
interface Telling {
  readonly fact: Fact;
  readonly tellerCopy: FactCopy;
  /** Who believed the lie and its false offenders, or `null` when belief is not decided. */
  readonly lie: {
    readonly believers: readonly CharacterId[];
    readonly offenders: CharacterId[];
  } | null;
}

/** The lie part of a telling: only for a `TELL` with `isFalse` whose believers were decided. */
function lieOf(input: RecordInput): Telling["lie"] {
  const believers = input.appraisal?.believers;
  if (!input.label.isFalse || believers === undefined) {
    return null;
  }
  const { blamed } = input.label;
  return { believers, offenders: blamed === undefined ? [] : [blamed] };
}

function tellingOf(input: RecordInput, author: CharacterState): Telling | null {
  const { label } = input;
  const { topic } = label;
  if (label.act !== "TELL" || !("fact" in topic)) {
    return null;
  }
  const fact = input.facts.find((held) => held.id === topic.fact);
  const tellerCopy = copyOf(author.memories, topic.fact);
  if (fact === undefined || tellerCopy === undefined) {
    throw new RangeError("a TELL of a fact needs the fact and the teller's copy: validate first");
  }
  return { fact, tellerCopy, lie: lieOf(input) };
}

/**
 * The `TOLD` copy of a hearer without one (simulation-model §12): fidelity
 * `mulBp(teller's current fidelity, 8000)`, measured before the teller's copy
 * is refreshed, and the teller's version, false or true.
 */
function toldCopy(telling: Telling, hearer: CharacterId): FactCopy[] {
  const { tellerCopy, lie } = telling;
  if (lie !== null && !lie.believers.includes(hearer)) {
    return [];
  }
  const copy = createCopy(
    tellerCopy.fact,
    { perspective: "TOLD", tellerFidelity: tellerCopy.fidelity },
    neutralImportance(involvedIn(telling.fact, hearer, [])),
    lie === null ? tellerCopy.falseOffenders : lie.offenders,
  );
  return [copy];
}

/** The importance of the new fact for `id`: the appraisal's, or the neutral one. */
function importanceFor(input: RecordInput, fact: ActFact, id: CharacterId): Bp {
  const given = input.appraisal?.importances?.find((entry) => entry.id === id);
  return given?.importance ?? neutralImportance(involvedIn(fact, id, input.perceived));
}

type Recorder = (character: CharacterState) => FactCopy[];

/** What one character keeps of the act: its own copy and, maybe, a told or refreshed one. */
function recorderFor(input: RecordInput, fact: ActFact, telling: Telling | null): Recorder {
  const perspectives = new Map(input.perceived.map((seen) => [seen.id, seen.perspective]));
  return (character) => {
    const isAuthor = character.id === input.author;
    const perspective = isAuthor ? "DIRECT" : perspectives.get(character.id);
    if (perspective === undefined) {
      return [...character.memories];
    }
    const own = createCopy(fact.id, { perspective }, importanceFor(input, fact, character.id));
    const told = telling === null ? [] : toldOrRefreshed(character, telling, isAuthor, perspective);
    return [...told, own].reduce(withCopy, [...character.memories]);
  };
}

function toldOrRefreshed(
  character: CharacterState,
  telling: Telling,
  isAuthor: boolean,
  perspective: ActPerspective,
): FactCopy[] {
  if (isAuthor) {
    return [retell(telling.tellerCopy)];
  }
  const known = copyOf(character.memories, telling.tellerCopy.fact) !== undefined;
  return perspective === "DIRECT" && !known ? toldCopy(telling, character.id) : [];
}

/**
 * Records an act (simulation-model §12): the fact, with the next id, the real
 * label, the appraisal's outcome band (none by default), the appraisal's offenders (none by default) and no
 * secret mark;
 * a `DIRECT` copy for the author and a copy with its perspective for each one
 * who perceived the act; and, in a `TELL` about a fact, the `TOLD` copies and
 * the teller's refreshed copy.
 *
 * @throws RangeError if a `TELL` is about a fact the record or the teller lacks.
 */
export function recordAct(input: RecordInput): Recorded {
  const fact: ActFact = {
    kind: "ACT",
    id: nextFactId(input.facts),
    tick: input.tick,
    author: input.author,
    label: input.label,
    band: input.appraisal?.band ?? null,
    offenders: input.appraisal?.offenders ?? [],
    secret: false,
  };
  const author = input.characters.find((character) => character.id === input.author);
  const telling = author === undefined ? null : tellingOf(input, author);
  const record = recorderFor(input, fact, telling);
  return {
    fact,
    facts: [...input.facts, fact],
    characters: input.characters.map((character) => ({
      ...character,
      memories: record(character),
    })),
  };
}
