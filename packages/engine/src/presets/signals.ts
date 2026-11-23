/**
 * Signals and their causes (simulation-model §7): the state of a character
 * shows in visual and vocal signals, each with its possible causes. The order
 * of the causes matters: on a tie, the first one of the signal's list wins.
 */
import { z } from "zod";

import { textSchema, uniqueList, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the signal causes, in the order of the first table of simulation-model §7. */
export const SIGNAL_CAUSE_IDS = [
  "fear",
  "sadness",
  "anger",
  "disgust",
  "shame",
  "guilt",
  "jealousy",
  "joy",
  "boredom",
  "attraction",
  "lying",
  "cold",
  "fatigue",
  "pain",
  "intoxication",
] as const;

/** Id of a signal cause: an emotion, `attraction`, `lying`, `cold` or a body need. */
export type SignalCauseId = (typeof SIGNAL_CAUSE_IDS)[number];

/** Ids of the signals, in the order of simulation-model §7. */
export const SIGNAL_IDS = [
  "tremor",
  "shakyVoice",
  "avertedGaze",
  "stepBack",
  "clenchedFists",
  "raisedVoice",
  "blush",
  "fixedStare",
  "lowGaze",
  "nervousLaugh",
  "smile",
  "laugh",
  "quietVoice",
  "tears",
  "grimace",
  "yawn",
  "slump",
  "slurredSpeech",
] as const;

/** Id of a signal. */
export type SignalId = (typeof SIGNAL_IDS)[number];

/** Schema of a signal: id, display name, channel and possible causes (at least one, in order). */
export const signalSchema = z.strictObject({
  id: z.enum(SIGNAL_IDS),
  name: textSchema,
  channel: z.enum(["VISUAL", "VOCAL"]),
  causes: uniqueList(z.enum(SIGNAL_CAUSE_IDS)).min(1),
});

/** A signal (simulation-model §7). */
export type SignalEntry = PresetOf<typeof signalSchema>;

/** The signals of simulation-model §7. */
export const SIGNALS: CatalogInput<typeof signalSchema> = [
  { id: "tremor", name: "tremor", channel: "VISUAL", causes: ["fear", "cold"] },
  { id: "shakyVoice", name: "voz trêmula", channel: "VOCAL", causes: ["fear", "sadness"] },
  {
    id: "avertedGaze",
    name: "olhar desviado",
    channel: "VISUAL",
    causes: ["shame", "guilt", "fear", "lying"],
  },
  { id: "stepBack", name: "passo atrás", channel: "VISUAL", causes: ["fear", "disgust"] },
  { id: "clenchedFists", name: "punhos cerrados", channel: "VISUAL", causes: ["anger"] },
  { id: "raisedVoice", name: "voz alta", channel: "VOCAL", causes: ["anger", "joy"] },
  { id: "blush", name: "rubor", channel: "VISUAL", causes: ["shame", "attraction", "anger"] },
  {
    id: "fixedStare",
    name: "olhar fixo",
    channel: "VISUAL",
    causes: ["anger", "jealousy", "attraction"],
  },
  { id: "lowGaze", name: "olhar baixo", channel: "VISUAL", causes: ["shame", "sadness"] },
  { id: "nervousLaugh", name: "riso nervoso", channel: "VOCAL", causes: ["shame", "fear"] },
  { id: "smile", name: "sorriso", channel: "VISUAL", causes: ["joy", "attraction"] },
  { id: "laugh", name: "risada", channel: "VOCAL", causes: ["joy"] },
  { id: "quietVoice", name: "voz baixa", channel: "VOCAL", causes: ["sadness", "fatigue"] },
  { id: "tears", name: "lágrimas", channel: "VISUAL", causes: ["sadness", "joy"] },
  { id: "grimace", name: "careta", channel: "VISUAL", causes: ["disgust", "pain"] },
  { id: "yawn", name: "bocejo", channel: "VISUAL", causes: ["fatigue", "boredom"] },
  { id: "slump", name: "ombros caídos", channel: "VISUAL", causes: ["fatigue", "sadness"] },
  {
    id: "slurredSpeech",
    name: "fala arrastada",
    channel: "VOCAL",
    causes: ["intoxication", "fatigue"],
  },
];
