/**
 * Topic types (dialogue-acts §4): what an act is about. Which types each act
 * accepts is part of the act catalog; the reference a topic carries (a
 * character, a fact, a tag…) is a rule of the acts module.
 */
import { z } from "zod";

import { textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the topic types, in the order of dialogue-acts §4. */
export const TOPIC_TYPE_IDS = [
  "PERSON",
  "THING",
  "PLACE",
  "EVENT",
  "SECRET",
  "RUMOR",
  "FEELING",
  "SMALL_TALK",
  "NONE",
] as const;

/** Id of a topic type. */
export type TopicTypeId = (typeof TOPIC_TYPE_IDS)[number];

/** Schema of a topic type: id and its meaning, used as display name. */
export const topicTypeSchema = z.strictObject({ id: z.enum(TOPIC_TYPE_IDS), name: textSchema });

/** A topic type (dialogue-acts §4). */
export type TopicTypeEntry = PresetOf<typeof topicTypeSchema>;

/** The topic types of dialogue-acts §4. */
export const TOPIC_TYPES: CatalogInput<typeof topicTypeSchema> = [
  { id: "PERSON", name: "uma pessoa (presente, ausente, o ouvinte ou quem fala)" },
  { id: "THING", name: "um objeto, posse ou apego" },
  { id: "PLACE", name: "um lugar" },
  { id: "EVENT", name: "algo que aconteceu" },
  { id: "SECRET", name: "fato marcado como segredo" },
  { id: "RUMOR", name: "fato conhecido de segunda mão (TOLD)" },
  { id: "FEELING", name: 'um sentimento ("o que sinto por você")' },
  { id: "SMALL_TALK", name: "amenidades: clima, trabalho, comida, o dia" },
  { id: "NONE", name: "sem tópico (atos sem fala)" },
];
