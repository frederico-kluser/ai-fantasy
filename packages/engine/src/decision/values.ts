/**
 * The values of a NPC candidate (dialogue-acts §5): the volume, the objects of
 * `REQUEST` and `OFFER` and the lie variants. The intensity is in `biases.ts`
 * (`npcIntensity`), next to the emotion bias it reads.
 */
import type { ActLabel, Topic } from "../acts/label.ts";
import { bondToward } from "../character/bonds.ts";
import { dominantDrives } from "../character/drives.ts";
import { effectiveTrait } from "../character/traits.ts";
import type { CharacterId } from "../domain/ids.ts";
import type { ActId } from "../presets/acts.ts";
import { DRIVE_IDS } from "../presets/drives.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import type { Volume } from "../space/hearing.ts";
import { offendersByCopy } from "./facts.ts";
import { othersById, type DecisionScene } from "./scene.ts";
import { pressure } from "./utility.ts";

/** Anger from which an `AGGRESSIVE` act is shouted (dialogue-acts §5). */
const SHOUTING_ANGER = 7000;
/** Effective honesty at or below which lie variants enter (dialogue-acts §5). */
const LIAR_HONESTY = -3000;
/** Affection from which the author protects an offender by denying (dialogue-acts §5). */
const PROTECTED_AFFECTION = 6000;
/** Resentment from which the author blames someone (dialogue-acts §5). */
const BLAMED_RESENTMENT = 3000;
/** The drives of highest pressure whose objects a `REQUEST` asks for (dialogue-acts §5). */
const REQUEST_DRIVES = 2;

/**
 * The volume of a NPC act (dialogue-acts §5): `WHISPER` in a `TELL` of a
 * `SECRET`; `SHOUT` when the target only hears so (`shouted`), or with anger ≥
 * 7000 in an `AGGRESSIVE` tone; `NORMAL` otherwise.
 */
export function npcVolume(
  scene: DecisionScene,
  label: Pick<ActLabel, "act" | "tone" | "topic">,
  shouted: boolean,
): Volume {
  if (label.act === "TELL" && label.topic.type === "SECRET") {
    return "WHISPER";
  }
  const angry = scene.author.emotions.anger >= SHOUTING_ANGER && label.tone === "AGGRESSIVE";
  return shouted || angry ? "SHOUT" : "NORMAL";
}

/**
 * The objects of a `REQUEST` to `target` (dialogue-acts §5): each object whose
 * drive in who receives it is among the author's two drives of highest
 * pressure toward the target (ties: catalog order of the drives), in catalog
 * order of the objects.
 */
export function requestObjects(scene: DecisionScene, target: CharacterId): RequestObjectId[] {
  const { drives } = scene.author;
  const top = [...DRIVE_IDS]
    .sort((a, b) => pressure(drives, b, target) - pressure(drives, a, target))
    .slice(0, REQUEST_DRIVES);
  return scene.objects.filter((object) => top.includes(object.receiverDrive)).map(({ id }) => id);
}

/** The objects of an `OFFER` (dialogue-acts §5): each whose drive in who gives it is dominant in the author. */
export function offerObjects(scene: DecisionScene): RequestObjectId[] {
  const dominant = dominantDrives(scene.author.drives);
  return scene.objects.filter((object) => dominant.includes(object.giverDrive)).map(({ id }) => id);
}

/** Whether the author lies at all: effective `honesty` ≤ −3000 (dialogue-acts §5). */
export function isLiar(scene: DecisionScene): boolean {
  const { author } = scene;
  return effectiveTrait(author.traits, author.tendencies, "honesty") <= LIAR_HONESTY;
}

/** The person a lie about a fact blames, `undefined` for a denial, `null` for no lie (dialogue-acts §5). */
function lieBlame(scene: DecisionScene, topic: Topic): CharacterId | undefined | null {
  const { author } = scene;
  const copy =
    "fact" in topic ? author.memories.find((held) => held.fact === topic.fact) : undefined;
  const fact = scene.facts.find((held) => held.id === copy?.fact);
  if (copy === undefined || fact === undefined) {
    return null;
  }
  const offenders = offendersByCopy(copy, fact);
  const bond = (id: CharacterId) => bondToward(author.bonds, id).axes;
  const shielded = offenders.some(
    (id) => id === author.id || bond(id).affection >= PROTECTED_AFFECTION,
  );
  if (shielded) {
    return undefined;
  }
  const blamed = othersById(scene)
    .filter(({ id }) => !offenders.includes(id) && bond(id).resentment >= BLAMED_RESENTMENT)
    .reduce<CharacterId | null>(
      (best, { id }) => (best === null || bond(id).resentment > bond(best).resentment ? id : best),
      null,
    );
  return blamed;
}

/** The acts whose lie variant has no fact: a false apology, a false promise. */
const FACTLESS_LIES: Readonly<Partial<Record<ActId, (label: ActLabel) => boolean>>> = {
  APOLOGIZE: () => true,
  OFFER: (label) => label.object === "PROMISE",
};

/**
 * The lie variant of a candidate of a liar (dialogue-acts §5), or `null`: a
 * `TELL` about a fact denies (an offender is the author or someone it loves)
 * or blames the other present it resents most (≥ 3000, not an offender; ties:
 * lowest id), and has no variant without such a person; an `APOLOGIZE` and an
 * `OFFER` of `PROMISE` lie without a fact.
 */
export function lieVariant(scene: DecisionScene, label: ActLabel): ActLabel | null {
  if (!isLiar(scene) || label.isFalse) {
    return null;
  }
  if (FACTLESS_LIES[label.act]?.(label) === true) {
    return { ...label, isFalse: true };
  }
  const blame = label.act === "TELL" ? lieBlame(scene, label.topic) : null;
  if (blame === null) {
    return null;
  }
  return blame === undefined
    ? { ...label, isFalse: true }
    : { ...label, isFalse: true, blamed: blame };
}
