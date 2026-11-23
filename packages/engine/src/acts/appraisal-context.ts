/**
 * What the conditions of the appraisal rows read (dialogue-acts §7.1): whether
 * the topic interests the reader (simulation-model §5.2), whether a fact told
 * is new to it, the version of a fact a `TELL` tells (true or false) and who a
 * fact is bad for (dialogue-acts §4).
 */
import { bondToward } from "../character/bonds.ts";
import { DIRECTED_DRIVE_IDS } from "../character/drives.ts";
import { perceptionPreview, perceptionToward } from "../character/perception.ts";
import type { AssociationSubject, CharacterState } from "../character/state.ts";
import type { AssociationTagId } from "../presets/tags.ts";
import { canonicalize } from "../session/canonical.ts";
import { effectiveTrait } from "../character/traits.ts";
import type { Bp } from "../domain/bp.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import type { FactCopy } from "../memory/copy.ts";
import type { Fact } from "../memory/fact.ts";
import type { ToneId } from "../presets/tones.ts";
import type { AnswerView, RowContext } from "./effect-terms.ts";
import type { ActLabel, Topic, TopicType } from "./label.ts";

/** A bond from which a person present in the topic interests (simulation-model §5.2). */
const INTERESTING_BOND = 5000;
/**
 * A directed drive from which its person is "um alvo de vontade dirigida"
 * (simulation-model §5.2): the floor of dialogue-acts §8.1 for directed drives.
 */
const INTERESTING_DRIVE = 3000;

function personInterests(
  reader: CharacterState,
  person: CharacterId,
  present: readonly CharacterId[],
): boolean {
  const axes = bondToward(reader.bonds, person).axes;
  const strong = Math.max(axes.affection, axes.resentment, axes.attraction) >= INTERESTING_BOND;
  const wanted = DIRECTED_DRIVE_IDS.some((drive) =>
    reader.drives.directed[drive].some(
      (entry) => entry.target === person && entry.deficit >= INTERESTING_DRIVE,
    ),
  );
  return person === reader.id || (present.includes(person) && strong) || wanted;
}

type InterestRule<T extends Topic = Topic> = (
  reader: CharacterState,
  topic: T,
  present: readonly CharacterId[],
) => boolean;

/** Whether `reader` has an association with `subject` (simulation-model §5.7). */
function associated(reader: CharacterState, subject: AssociationSubject): boolean {
  const wanted = canonicalize(subject);
  return reader.associations.some((entry) => canonicalize(entry.subject) === wanted);
}

const NEVER: InterestRule = () => false;
const KNOWN_FACT: InterestRule = (reader, topic) =>
  "fact" in topic && reader.memories.some((copy) => copy.fact === topic.fact);

/** simulation-model §5.2, "Um ato interessa a X quando…", by topic type. */
const INTEREST: { readonly [K in TopicType]: InterestRule<Extract<Topic, { type: K }>> } = {
  PERSON: (reader, topic, present) => personInterests(reader, topic.person, present),
  THING: (reader, topic) => associated(reader, { kind: "THING", thing: topic.thing }),
  // The place of the scene ("SCENE") is no association tag, so it never matches.
  PLACE: (reader, topic) =>
    associated(reader, { kind: "TAG", tag: topic.place as AssociationTagId }),
  EVENT: KNOWN_FACT,
  SECRET: KNOWN_FACT,
  RUMOR: KNOWN_FACT,
  FEELING: NEVER,
  SMALL_TALK: NEVER,
  NONE: NEVER,
};

/**
 * Whether the topic of an act interests `reader` (simulation-model §5.2, the
 * topic part; being a target is the act's part): the reader itself; a person
 * present with whom it has affection, resentment or attraction ≥ 5000; a
 * person toward whom it has a directed drive with deficit ≥ 3000; a thing or a
 * tag it is associated with; a fact it holds a copy of. The place of the scene,
 * feelings and small talk interest by themselves no one.
 */
export function topicInterests(
  reader: CharacterState,
  topic: Topic,
  present: readonly CharacterId[],
): boolean {
  // The rule of a topic type takes exactly the topics of that type.
  const rule = INTEREST[topic.type] as InterestRule;
  return rule(reader, topic, present);
}

/**
 * The offenders in the version a `TELL` tells (dialogue-acts §5): a lie tells
 * the false version (`blamed`, or nobody); a truth tells the teller's copy
 * (false when the teller believed a lie), or the fact's.
 */
export function toldOffenders(
  label: ActLabel,
  fact: Fact,
  tellerCopy: FactCopy | undefined,
): readonly CharacterId[] {
  if (label.isFalse) {
    return label.blamed === undefined ? [] : [label.blamed];
  }
  return tellerCopy?.falseOffenders ?? fact.offenders;
}

/**
 * Who `fact` is bad for (dialogue-acts §4), sorted by id: its `offenders`, and
 * its author when the topic is a `SECRET` (a secret of Y: Y is author or
 * offender).
 */
export function badSubjects(
  fact: Fact,
  offenders: readonly CharacterId[],
  type: TopicType,
): CharacterId[] {
  const owners = type === "SECRET" ? [fact.author] : [];
  return [...new Set([...offenders, ...owners])].sort(compareIds);
}

/** Who appraises the act, about whom, and what it knows. */
export interface ContextInput {
  readonly author: CharacterState;
  /** The real label of the act. */
  readonly label: ActLabel;
  /** The record before the act. */
  readonly facts: readonly Fact[];
  /** The ids of everyone present. */
  readonly present: readonly CharacterId[];
  /** The one who appraises, before the act. */
  readonly reader: CharacterState;
  /** The one addressed: the reader itself for a target, the first target for a witness. */
  readonly subject: CharacterId;
  /** The tone the reader read (or the real one, for the author's view). */
  readonly tone: ToneId;
  /** The answer, when the act answers the subject. */
  readonly answer: AnswerView | null;
  /** In a lie about a fact, the hearers who believed it; `null` otherwise. */
  readonly believers: readonly CharacterId[] | null;
}

/** How sincere `author` seems to `reader` (simulation-model §5.5; the preview without a record). */
export function sincerityOf(reader: CharacterState, author: CharacterId): Bp {
  const trust = effectiveTrait(reader.traits, reader.tendencies, "trustInOthers");
  const preview = perceptionPreview(bondToward(reader.bonds, author), trust);
  return perceptionToward(reader.perceptions, author, preview).perceivedSincerity;
}

/** The fact of the topic, with the offenders the act states, when it is about one. */
function factView(input: ContextInput) {
  const { label } = input;
  const { topic } = label;
  const fact = "fact" in topic ? input.facts.find((held) => held.id === topic.fact) : undefined;
  if (fact === undefined) {
    return null;
  }
  const tellerCopy = input.author.memories.find((copy) => copy.fact === fact.id);
  const stated = label.act === "TELL" ? toldOffenders(label, fact, tellerCopy) : fact.offenders;
  return { fact, bad: badSubjects(fact, stated, topic.type) };
}

/** The context of the rows for one reader (dialogue-acts §7.1). */
export function rowContext(input: ContextInput): RowContext {
  const { label, reader, subject, believers } = input;
  const view = factView(input);
  const known = reader.memories.some((copy) => copy.fact === view?.fact.id);
  const holds = believers === null || believers.includes(reader.id);
  return {
    tone: input.tone,
    bond: bondToward(reader.bonds, input.author.id).axes,
    sincerity: sincerityOf(reader, input.author.id),
    topicInterests: topicInterests(reader, label.topic, input.present),
    newFact: label.act === "TELL" && view !== null && !known && holds,
    secret: label.topic.type === "SECRET",
    badFact: view?.bad.includes(subject) ?? false,
    accusationTrue: label.act === "ACCUSE" && (view?.fact.offenders.includes(subject) ?? false),
    answer: input.answer,
  };
}
