/**
 * The candidates of a character in `AUTO` who has the turn (simulation-model
 * §10 items 1 and 2): the answers it owes, or the combinations of act × target
 * × tone × topic with their values. The pre-conditions of dialogue-acts §9.1
 * and the target rules are tables, not branches by act.
 */
import type { Topic } from "../acts/label.ts";
import { WITHDRAW_DISTANCE } from "../domain/constants.ts";
import type { CharacterState } from "../character/state.ts";
import { ACT_IDS, type ActId } from "../presets/acts.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import { canSee } from "../space/sight.ts";
import { answerCandidates, silence } from "./answers.ts";
import { makeLabel, rankTones, toOne, withLie, type TargetOption } from "./build.ts";
import { isDirectedTo, sliceActs } from "./facts.ts";
import {
  distanceTo,
  groupListeners,
  othersById,
  reachVolume,
  type DecisionScene,
} from "./scene.ts";
import { candidateTopics } from "./topics.ts";
import type { Candidate } from "./utility.ts";
import { offerObjects, requestObjects } from "./values.ts";

/** Who an act may be addressed to (simulation-model §10 item 2, "Alvos"). */
type TargetRule = "HEARERS" | "HEARERS_OR_GROUP" | "ADJACENT" | "VISIBLE_FAR" | "NEAR";

/** Whether a candidate enters (dialogue-acts §9.1), given its target option and topic. */
type Precondition = (scene: DecisionScene, option: TargetOption, topic: Topic) => boolean;

/** The objects a candidate is made with: none, or those of dialogue-acts §5. */
type ObjectRule = (scene: DecisionScene, option: TargetOption) => (RequestObjectId | undefined)[];

interface ActPlan {
  readonly targets: TargetRule;
  readonly precondition?: Precondition;
  readonly objects?: ObjectRule;
}

/** Guilt from which a NPC apologizes without being accused (dialogue-acts §9.1). */
const APOLOGETIC_GUILT = 2000;
/** "A até 3 células" of `WITHDRAW` (simulation-model §10): nearer than the distance it seeks. */
const NEAR_DISTANCE = WITHDRAW_DISTANCE - 1;
/** `TOUCH` needs the target at 1 cell. */
const TOUCH_DISTANCE = 1;

/** Whether `author` addressed `act` to `who` in this slice. */
function didInSlice(scene: DecisionScene, author: CharacterState, act: ActId, who: CharacterState) {
  return sliceActs(scene.facts, scene.sliceStart).some(
    (fact) => fact.author === author.id && fact.label.act === act && isDirectedTo(fact, who),
  );
}

const notGreeted: Precondition = (scene, option) =>
  option.listeners.every((listener) => !didInSlice(scene, scene.author, "GREET", listener));

const whisperable: Precondition = (scene, option, topic) =>
  topic.type !== "SECRET" ||
  option.listeners.every((listener) => distanceTo(scene, listener) <= TOUCH_DISTANCE);

const apologetic: Precondition = (scene, option) =>
  scene.author.emotions.guilt >= APOLOGETIC_GUILT ||
  (option.target !== null && didInSlice(scene, option.target, "ACCUSE", scene.author));

const askObjects: ObjectRule = (scene, option) =>
  option.target === null ? [] : requestObjects(scene, option.target.id);

/** The candidate acts and their rules (simulation-model §10 item 2; dialogue-acts §9.1). */
const PLANS: Readonly<Partial<Record<ActId, ActPlan>>> = {
  GREET: { targets: "HEARERS_OR_GROUP", precondition: notGreeted },
  CHAT: { targets: "HEARERS_OR_GROUP" },
  ASK: { targets: "HEARERS" },
  TELL: { targets: "HEARERS_OR_GROUP", precondition: whisperable },
  PRAISE: { targets: "HEARERS" },
  TEASE: { targets: "HEARERS" },
  ACCUSE: { targets: "HEARERS" },
  REQUEST: { targets: "HEARERS", objects: askObjects },
  OFFER: { targets: "HEARERS", objects: offerObjects },
  APOLOGIZE: { targets: "HEARERS", precondition: apologetic },
  THREATEN: { targets: "HEARERS" },
  APPROACH: { targets: "VISIBLE_FAR" },
  WITHDRAW: { targets: "NEAR" },
  TOUCH: { targets: "ADJACENT" },
};

function hearers(scene: DecisionScene): TargetOption[] {
  return othersById(scene).flatMap((other) => {
    const reach = reachVolume(scene, other);
    return reach === null ? [] : [toOne(other, reach)];
  });
}

function group(scene: DecisionScene): TargetOption[] {
  const listeners = groupListeners(scene);
  return listeners.length < 2
    ? []
    : [{ targets: "GROUP", reach: "NORMAL", target: null, listeners }];
}

function within(scene: DecisionScene, test: (other: CharacterState) => boolean): TargetOption[] {
  return othersById(scene)
    .filter(test)
    .map((other) => toOne(other));
}

const TARGET_RULES: Readonly<Record<TargetRule, (scene: DecisionScene) => TargetOption[]>> = {
  HEARERS: hearers,
  HEARERS_OR_GROUP: (scene) => [...hearers(scene), ...group(scene)],
  ADJACENT: (scene) => within(scene, (other) => distanceTo(scene, other) <= TOUCH_DISTANCE),
  VISIBLE_FAR: (scene) =>
    within(
      scene,
      (other) =>
        distanceTo(scene, other) > TOUCH_DISTANCE &&
        canSee(scene.grid, scene.author.cell, other.cell, scene.now.vision),
    ),
  NEAR: (scene) => within(scene, (other) => distanceTo(scene, other) <= NEAR_DISTANCE),
};

const NO_OBJECT: ObjectRule = () => [undefined];

/** The candidates of one act toward one target option, in generation order. */
function optionCandidates(scene: DecisionScene, act: ActId, plan: ActPlan, option: TargetOption) {
  const enters = plan.precondition ?? (() => true);
  const objects = (plan.objects ?? NO_OBJECT)(scene, option);
  const topics = candidateTopics(scene, act, option.target);
  return rankTones(scene, act, option).flatMap((tone) =>
    topics
      .filter((topic) => enters(scene, option, topic))
      .flatMap((topic) =>
        objects.flatMap((object) =>
          withLie(scene, makeLabel(scene, act, option, { tone, topic, object })),
        ),
      ),
  );
}

function actCandidates(scene: DecisionScene, act: ActId): Candidate[] {
  const plan = PLANS[act];
  if (plan === undefined) {
    return act === "STAY_SILENT" ? [silence(scene)] : [];
  }
  return TARGET_RULES[plan.targets](scene).flatMap((option) =>
    optionCandidates(scene, act, plan, option),
  );
}

/**
 * The candidates of `scene.author` (simulation-model §10 items 1 and 2), in
 * generation order (the order that breaks ties in the choice): the answers it
 * owes and `STAY_SILENT`; or, owing none, every act but `MOVE`, `ACCEPT`,
 * `REFUSE`, `FAREWELL` and `LEAVE`, in catalog order, toward each target in
 * id order and then the `GROUP`, in its 3 tones of highest bias, about each
 * topic of its rule, with each object, the truth before the lie.
 *
 * @throws RangeError if a request owed has no band drawn (see `owedBands`).
 */
export function generateCandidates(scene: DecisionScene): Candidate[] {
  return answerCandidates(scene) ?? ACT_IDS.flatMap((act) => actCandidates(scene, act));
}
