/**
 * Acts (dialogue-acts §2 and §4): the 14 speech acts and the 6 acts without
 * speech, with their cost in ticks, whether they create an obligation to
 * answer, whether they are requests (an outcome band is drawn) and the topic
 * types they accept.
 */
import { z } from "zod";

import { textSchema, uniqueList, type CatalogInput, type PresetOf } from "./primitives.ts";
import { TOPIC_TYPE_IDS, type TopicTypeId } from "./topics.ts";

/** Ids of the acts: the speech acts of dialogue-acts §2.1, then those of §2.2. */
export const ACT_IDS = [
  "GREET",
  "CHAT",
  "ASK",
  "TELL",
  "PRAISE",
  "TEASE",
  "ACCUSE",
  "REQUEST",
  "OFFER",
  "APOLOGIZE",
  "THREATEN",
  "ACCEPT",
  "REFUSE",
  "FAREWELL",
  "STAY_SILENT",
  "MOVE",
  "APPROACH",
  "WITHDRAW",
  "LEAVE",
  "TOUCH",
] as const;

/** Id of an act. */
export type ActId = (typeof ACT_IDS)[number];

/**
 * Schema of an act: `speech` (whether it is a speech act), cost in `ticks`
 * (`secretTicks` when its topic is a `SECRET`, only for `TELL`),
 * `createsObligation`, `request` (an outcome band is drawn) and the accepted
 * `topics`: the topic types, or `"ANSWERED"` for the topic of the act answered.
 */
export const actSchema = z.strictObject({
  id: z.enum(ACT_IDS),
  name: textSchema,
  speech: z.boolean(),
  ticks: z.int().min(1),
  secretTicks: z.int().min(1).optional(),
  createsObligation: z.boolean(),
  request: z.boolean(),
  topics: z.union([z.literal("ANSWERED"), uniqueList(z.enum(TOPIC_TYPE_IDS)).min(1)]),
});

/** An act (dialogue-acts §2). */
export type ActEntry = PresetOf<typeof actSchema>;

type ActInput = CatalogInput<typeof actSchema>[number];

/** "Every type but `NONE`" (dialogue-acts §4: `ASK` and `TELL`). */
const ANY_TOPIC: readonly TopicTypeId[] = [
  "PERSON",
  "THING",
  "PLACE",
  "EVENT",
  "SECRET",
  "RUMOR",
  "FEELING",
  "SMALL_TALK",
];

/** An act without speech (dialogue-acts §2.2): 1 tick, no obligation, topic `NONE`. */
function silent(id: ActId, name: string): ActInput {
  return {
    id,
    name,
    speech: false,
    ticks: 1,
    createsObligation: false,
    request: false,
    topics: ["NONE"],
  };
}

/** The acts of dialogue-acts §2, with the topics of §4. */
export const ACTS: CatalogInput<typeof actSchema> = [
  {
    id: "GREET",
    name: "cumprimentar",
    speech: true,
    ticks: 1,
    createsObligation: false,
    request: false,
    topics: ["PERSON", "SMALL_TALK"],
  },
  {
    id: "CHAT",
    name: "conversar (papo sobre um tópico)",
    speech: true,
    ticks: 3,
    createsObligation: false,
    request: false,
    topics: ["PERSON", "THING", "PLACE", "EVENT", "RUMOR", "FEELING", "SMALL_TALK"],
  },
  {
    id: "ASK",
    name: "perguntar",
    speech: true,
    ticks: 2,
    createsObligation: true,
    request: false,
    topics: ANY_TOPIC,
  },
  {
    id: "TELL",
    name: "contar (fato, rumor, segredo)",
    speech: true,
    ticks: 3,
    secretTicks: 6,
    createsObligation: false,
    request: false,
    topics: ANY_TOPIC,
  },
  {
    id: "PRAISE",
    name: "elogiar",
    speech: true,
    ticks: 2,
    createsObligation: false,
    request: false,
    topics: ["PERSON", "THING", "FEELING"],
  },
  {
    id: "TEASE",
    name: "provocar",
    speech: true,
    ticks: 2,
    createsObligation: false,
    request: false,
    topics: ["PERSON", "THING", "EVENT", "FEELING"],
  },
  {
    id: "ACCUSE",
    name: "acusar",
    speech: true,
    ticks: 3,
    createsObligation: true,
    request: false,
    topics: ["EVENT", "SECRET"],
  },
  {
    id: "REQUEST",
    name: "pedir",
    speech: true,
    ticks: 2,
    createsObligation: true,
    request: true,
    topics: ["PERSON"],
  },
  {
    id: "OFFER",
    name: "oferecer (ajuda, presente, acordo, promessa, encontro)",
    speech: true,
    ticks: 2,
    createsObligation: true,
    request: true,
    topics: ["PERSON"],
  },
  {
    id: "APOLOGIZE",
    name: "desculpar-se",
    speech: true,
    ticks: 3,
    createsObligation: true,
    request: true,
    topics: ["EVENT", "PERSON"],
  },
  {
    id: "THREATEN",
    name: "ameaçar",
    speech: true,
    ticks: 2,
    createsObligation: true,
    request: true,
    topics: ["PERSON", "EVENT", "SECRET"],
  },
  {
    id: "ACCEPT",
    name: "aceitar",
    speech: true,
    ticks: 1,
    createsObligation: false,
    request: false,
    topics: "ANSWERED",
  },
  {
    id: "REFUSE",
    name: "recusar, negar, não responder",
    speech: true,
    ticks: 1,
    createsObligation: false,
    request: false,
    topics: "ANSWERED",
  },
  {
    id: "FAREWELL",
    name: "despedir-se",
    speech: true,
    ticks: 1,
    createsObligation: false,
    request: false,
    topics: ["PERSON", "SMALL_TALK"],
  },
  silent("STAY_SILENT", "ficar calado, só ouvir"),
  silent("MOVE", "ir até uma célula"),
  silent("APPROACH", "aproximar-se de alguém"),
  silent("WITHDRAW", "afastar-se de alguém"),
  silent("LEAVE", "sair da cena"),
  silent("TOUCH", "contato físico"),
];
