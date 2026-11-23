/**
 * Tones (dialogue-acts §3): how an act is done. Each tone has a base ambiguity
 * (the chance of being misread) and the tones it is typically confused with,
 * read for the worse or for the better. Their order matters: a misreading
 * draws among them by weight.
 */
import { z } from "zod";

import { bpSchema, textSchema, type CatalogInput, type PresetOf } from "./primitives.ts";

/** Ids of the tones, in the order of dialogue-acts §3. */
export const TONE_IDS = [
  "WARM",
  "NEUTRAL",
  "PLAYFUL",
  "SEDUCTIVE",
  "IRONIC",
  "AGGRESSIVE",
] as const;

/** Id of a tone. */
export type ToneId = (typeof TONE_IDS)[number];

const confusionSchema = z.strictObject({
  tone: z.enum(TONE_IDS),
  kind: z.enum(["WORSE", "BETTER"]),
});

type Confusion = z.output<typeof confusionSchema>;

interface ToneShape {
  readonly id: ToneId;
  readonly confusions: readonly Confusion[];
}

function confusionProblem(tone: ToneShape, { tone: other }: Confusion, index: number) {
  if (other === tone.id) {
    return "a tone is not confused with itself";
  }
  const first = tone.confusions.findIndex((confusion) => confusion.tone === other);
  return first < index ? `${other} is repeated` : undefined;
}

/**
 * Schema of a tone: base `ambiguity` in bp and the typical `confusions`, each a
 * different tone read for the `WORSE` or for the `BETTER` (at least one).
 */
export const toneSchema = z
  .strictObject({
    id: z.enum(TONE_IDS),
    name: textSchema,
    ambiguity: bpSchema,
    confusions: z.array(confusionSchema).min(1),
  })
  .superRefine((tone, context) => {
    tone.confusions.forEach((confusion, index) => {
      const message = confusionProblem(tone, confusion, index);
      if (message !== undefined) {
        context.addIssue({ code: "custom", path: ["confusions", index, "tone"], message });
      }
    });
  });

/** A tone (dialogue-acts §3). */
export type ToneEntry = PresetOf<typeof toneSchema>;

/** The tones of dialogue-acts §3. */
export const TONES: CatalogInput<typeof toneSchema> = [
  {
    id: "WARM",
    name: "caloroso",
    ambiguity: 500,
    confusions: [{ tone: "SEDUCTIVE", kind: "BETTER" }],
  },
  {
    id: "NEUTRAL",
    name: "neutro",
    ambiguity: 300,
    confusions: [{ tone: "IRONIC", kind: "WORSE" }],
  },
  {
    id: "PLAYFUL",
    name: "brincalhão",
    ambiguity: 1500,
    confusions: [
      { tone: "AGGRESSIVE", kind: "WORSE" },
      { tone: "IRONIC", kind: "WORSE" },
    ],
  },
  {
    id: "SEDUCTIVE",
    name: "sedutor",
    ambiguity: 1500,
    confusions: [
      { tone: "WARM", kind: "BETTER" },
      { tone: "PLAYFUL", kind: "BETTER" },
    ],
  },
  {
    id: "IRONIC",
    name: "irônico",
    ambiguity: 2500,
    confusions: [
      { tone: "AGGRESSIVE", kind: "WORSE" },
      { tone: "PLAYFUL", kind: "BETTER" },
    ],
  },
  {
    id: "AGGRESSIVE",
    name: "agressivo",
    ambiguity: 500,
    confusions: [{ tone: "PLAYFUL", kind: "BETTER" }],
  },
];
