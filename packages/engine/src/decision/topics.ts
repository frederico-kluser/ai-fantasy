/**
 * The topics of the candidates (simulation-model §10 item 2, "Tópicos", and
 * "Detalhes da decisão"): the rule of each act, the salient topics of the
 * author for a target and the filter by the types each act accepts.
 */
import type { Topic } from "../acts/label.ts";
import { actEntry } from "../acts/rules.ts";
import { DIRECTED_DRIVE_IDS, directedTarget, dominantDrives } from "../character/drives.ts";
import { bondToward } from "../character/bonds.ts";
import type { CharacterState } from "../character/state.ts";
import { TOPICS_MAX } from "../domain/constants.ts";
import type { CharacterId } from "../domain/ids.ts";
import type { FactCopy } from "../memory/copy.ts";
import type { Fact } from "../memory/fact.ts";
import { involvedIn } from "../memory/record.ts";
import type { ActId } from "../presets/acts.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import { canonicalize } from "../session/canonical.ts";
import {
  isDirectedTo,
  lastActTo,
  mostImportant,
  offendersByCopy,
  type KnownFact,
} from "./facts.ts";
import { otherIds, type DecisionScene } from "./scene.ts";

/** A bond axis from which a feeling is salient (simulation-model §10). */
const SALIENT_FEELING = 6000;
/** The axes a salient feeling may be about, in the order that breaks ties. */
const FEELING_AXES: readonly BondAxisId[] = ["affection", "attraction", "resentment"];

const NONE: Topic = { type: "NONE" };
const SMALL_TALK: Topic = { type: "SMALL_TALK" };

/** The topic of a known fact: `SECRET` if secret, `RUMOR` if the copy was told, else `EVENT`. */
export function factTopic(fact: Fact, copy: FactCopy): Topic {
  if (fact.secret) {
    return { type: "SECRET", fact: fact.id };
  }
  return { type: copy.perspective === "TOLD" ? "RUMOR" : "EVENT", fact: fact.id };
}

function person(id: CharacterId): Topic {
  return { type: "PERSON", person: id };
}

/** The topics without repetitions, in order. */
function distinct(topics: readonly Topic[]): Topic[] {
  const seen = new Set<string>();
  return topics.filter((topic) => {
    const key = canonicalize(topic);
    const fresh = !seen.has(key);
    seen.add(key);
    return fresh;
  });
}

function drivenTargets(scene: DecisionScene): Topic[] {
  const { drives } = scene.author;
  const dominant = dominantDrives(drives);
  return DIRECTED_DRIVE_IDS.filter((drive) => dominant.includes(drive)).flatMap((drive) => {
    const target = directedTarget(drives, drive, otherIds(scene));
    return target === null ? [] : [person(target)];
  });
}

function importantFact(scene: DecisionScene): Topic[] {
  const present = otherIds(scene);
  const found = mostImportant(scene.author, scene.facts, ({ fact }) =>
    present.some((id) => involvedIn(fact, id, [])),
  );
  return found === null ? [] : [factTopic(found.fact, found.copy)];
}

function feeling(scene: DecisionScene, target: CharacterState): Topic[] {
  const { axes } = bondToward(scene.author.bonds, target.id);
  const axis = FEELING_AXES.reduce((best, each) => (axes[each] > axes[best] ? each : best));
  return axes[axis] >= SALIENT_FEELING
    ? [{ type: "FEELING", feeling: { kind: "BOND", axis } }]
    : [];
}

function associated(scene: DecisionScene): Topic[] {
  const found = scene.author.associations.find(
    ({ subject }) =>
      subject.kind === "THING" ||
      (subject.kind === "TAG" && scene.now.presentTags.includes(subject.tag)),
  )?.subject;
  if (found?.kind === "THING") {
    return [{ type: "THING", thing: found.thing }];
  }
  return found?.kind === "TAG" ? [{ type: "PLACE", place: found.tag }] : [];
}

/**
 * The salient topics of the author for `target` (`null` for the `GROUP`), in
 * order and without repetitions (simulation-model §10): the topic of the last
 * act addressed to the author; the targets of its dominant directed drives;
 * the most important fact involving another present; a feeling ≥ 6000 for
 * the target; the target; an associated thing or present tag; small talk.
 */
export function salientTopics(scene: DecisionScene, target: CharacterState | null): Topic[] {
  const last = lastActTo(scene.facts, scene.author)?.label.topic;
  return distinct([
    ...(last === undefined || last.type === "NONE" ? [] : [last]),
    ...drivenTargets(scene),
    ...importantFact(scene),
    ...(target === null ? [] : [...feeling(scene, target), person(target.id)]),
    ...associated(scene),
    SMALL_TALK,
  ]);
}

/**
 * Whether `act` of the author accepts `topic` (dialogue-acts §4): its type is
 * one the act accepts, and a `TELL` of a fact needs the author's copy.
 */
export function acceptsTopic(scene: DecisionScene, act: ActId, topic: Topic): boolean {
  const accepted = actEntry(scene.rules, act).topics;
  const typeFits = accepted !== "ANSWERED" && accepted.includes(topic.type);
  const needsCopy = act === "TELL" && "fact" in topic;
  return typeFits && (!needsCopy || scene.author.memories.some((copy) => copy.fact === topic.fact));
}

/** The salient topics an act accepts, limited to 4 (`TOPICS_MAX`) after the filter. */
function salientFor(scene: DecisionScene, act: ActId, target: CharacterState | null): Topic[] {
  return salientTopics(scene, target)
    .filter((topic) => acceptsTopic(scene, act, topic))
    .slice(0, TOPICS_MAX);
}

/** Whether `target` is a target or the topic of a fact, or its side B (dialogue-acts §9.1, `APOLOGIZE`). */
function concerns(fact: Fact, target: CharacterState): boolean {
  if (fact.kind === "HISTORY") {
    return fact.subject === target.id;
  }
  const { topic } = fact.label;
  return isDirectedTo(fact, target) || (topic.type === "PERSON" && topic.person === target.id);
}

function offends(known: KnownFact, who: CharacterId): boolean {
  return offendersByCopy(known.copy, known.fact).includes(who);
}

/** The most important fact in which `who` is the offender, by the author's copy. */
export function offenceBy(scene: DecisionScene, who: CharacterId, secretOnly = false): Fact | null {
  const found = mostImportant(
    scene.author,
    scene.facts,
    (known) => offends(known, who) && (!secretOnly || known.fact.secret),
  );
  return found?.fact ?? null;
}

type TopicRule = (scene: DecisionScene, target: CharacterState | null) => Topic[];

const ofTarget: TopicRule = (_scene, target) => [target === null ? SMALL_TALK : person(target.id)];

const accusation: TopicRule = (scene, target) => {
  const fact = target === null ? null : offenceBy(scene, target.id);
  return fact === null ? [] : [{ type: "EVENT", fact: fact.id }];
};

const apology: TopicRule = (scene, target) => {
  const found =
    target === null
      ? null
      : mostImportant(
          scene.author,
          scene.facts,
          (known) => offends(known, scene.author.id) && concerns(known.fact, target),
        );
  return found === null ? ofTarget(scene, target) : [{ type: "EVENT", fact: found.fact.id }];
};

const threat: TopicRule = (scene, target) => {
  const secret = target === null ? null : offenceBy(scene, target.id, true);
  return [
    ...ofTarget(scene, target),
    ...(secret === null ? [] : [{ type: "SECRET" as const, fact: secret.id }]),
  ];
};

const telling: TopicRule = (scene, target) => {
  const secret = mostImportant(scene.author, scene.facts, ({ fact }) => fact.secret);
  const told: Topic[] = secret === null ? [] : [{ type: "SECRET", fact: secret.fact.id }];
  return distinct([...salientFor(scene, "TELL", target), ...told]);
};

const salientRule =
  (act: ActId): TopicRule =>
  (scene, target) =>
    salientFor(scene, act, target);

/** The topic rule of each candidate act (simulation-model §10 item 2, "Tópicos"). */
const TOPIC_RULES: Readonly<Partial<Record<ActId, TopicRule>>> = {
  GREET: ofTarget,
  CHAT: salientRule("CHAT"),
  ASK: salientRule("ASK"),
  TELL: telling,
  PRAISE: salientRule("PRAISE"),
  TEASE: salientRule("TEASE"),
  ACCUSE: accusation,
  REQUEST: ofTarget,
  OFFER: ofTarget,
  APOLOGIZE: apology,
  THREATEN: threat,
};

/**
 * The topics of the candidates of `act` toward `target` (`null` for the
 * `GROUP` or for nobody), in the order of the rule: acts without speech talk
 * about nothing (`NONE`).
 */
export function candidateTopics(
  scene: DecisionScene,
  act: ActId,
  target: CharacterState | null,
): Topic[] {
  const rule = TOPIC_RULES[act];
  return rule === undefined ? [NONE] : rule(scene, target);
}
