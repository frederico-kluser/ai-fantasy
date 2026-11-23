/**
 * Character archetypes (presets §5): the traits each one marks, its dominant
 * drives (2 or 3), its high aptitudes and the voice the text model uses. The
 * ranges drawn around these values belong to the cast generation.
 */
import { z } from "zod";

import { DRIVE_IDS } from "./drives.ts";
import {
  bipolarSchema,
  textListSchema,
  textSchema,
  uniqueList,
  type CatalogInput,
  type PresetOf,
} from "./primitives.ts";
import { APTITUDE_IDS, TRAIT_IDS } from "./traits.ts";

/** Ids of the character archetypes, in the order of presets §5. */
export const CHARACTER_ARCHETYPE_IDS = [
  "caretaker",
  "protector",
  "proud_worker",
  "merchant",
  "adventurer",
  "scholar",
  "seducer",
  "rebel",
  "authoritarian",
  "shy_observer",
  "devout",
  "trickster",
  "elder",
  "child",
  "bitter_loner",
  "bohemian",
] as const;

/** Id of a character archetype. */
export type CharacterArchetypeId = (typeof CHARACTER_ARCHETYPE_IDS)[number];

/**
 * Schema of a character archetype: display `name` and `examples`, the marked
 * `traits` (bipolar), 2 or 3 `dominantDrives`, the `highAptitudes` and the
 * `voice` (presentation for the text model).
 */
export const characterArchetypeSchema = z.strictObject({
  id: z.enum(CHARACTER_ARCHETYPE_IDS),
  name: textSchema,
  examples: textListSchema,
  traits: z.partialRecord(z.enum(TRAIT_IDS), bipolarSchema),
  dominantDrives: uniqueList(z.enum(DRIVE_IDS)).min(2).max(3),
  highAptitudes: uniqueList(z.enum(APTITUDE_IDS)),
  voice: textSchema,
});

/** A character archetype (presets §5). */
export type CharacterArchetype = PresetOf<typeof characterArchetypeSchema>;

/** The character archetypes of presets §5. */
export const CHARACTER_ARCHETYPES: CatalogInput<typeof characterArchetypeSchema> = [
  {
    id: "caretaker",
    name: "cuidador(a)",
    examples: ["mãe", "enfermeira", "curandeira"],
    traits: { empathy: 7000, temper: -3000 },
    dominantDrives: ["care", "intimacy", "company"],
    highAptitudes: ["perceptiveness"],
    voice: "acolhedora, pergunta muito",
  },
  {
    id: "protector",
    name: "protetor(a)",
    examples: ["guarda", "irmão mais velho", "policial"],
    traits: { courage: 7000, trustInOthers: -2000 },
    dominantDrives: ["care", "physical_safety", "dignity"],
    highAptitudes: [],
    voice: "firme, frases curtas",
  },
  {
    id: "proud_worker",
    name: "trabalhador(a) orgulhoso(a)",
    examples: ["ferreiro", "pedreiro", "artesão"],
    traits: { pride: 6000, honesty: 4000 },
    dominantDrives: ["purpose", "recognition", "dignity"],
    highAptitudes: [],
    voice: "direta, poucas palavras",
  },
  {
    id: "merchant",
    name: "negociante calculista",
    examples: ["comerciante", "agiota", "vendedor"],
    traits: { trustInOthers: -3000, sociability: 3000 },
    dominantDrives: ["material_security", "influence"],
    highAptitudes: ["eloquence"],
    voice: "persuasiva, interesseira",
  },
  {
    id: "adventurer",
    name: "aventureiro(a) impulsivo(a)",
    examples: ["viajante", "mercenário", "explorador"],
    traits: { courage: 6000, selfControl: -5000 },
    dominantDrives: ["fun", "curiosity", "purpose"],
    highAptitudes: [],
    voice: "animada, exagera",
  },
  {
    id: "scholar",
    name: "estudioso(a) curioso(a)",
    examples: ["sábio", "professor", "cientista"],
    traits: { sociability: -2000, honesty: 3000 },
    dominantDrives: ["curiosity", "recognition"],
    highAptitudes: ["memory", "perceptiveness"],
    voice: "precisa, cheia de referências",
  },
  {
    id: "seducer",
    name: "sedutor(a)",
    examples: ["galanteador", "cortesã", "conquistador"],
    traits: { romanticBoldness: 8000, honesty: -2000 },
    dominantDrives: ["desire", "recognition", "fun"],
    highAptitudes: ["eloquence"],
    voice: "charmosa, insinuante",
  },
  {
    id: "rebel",
    name: "rebelde",
    examples: ["jovem revoltado", "insurgente"],
    traits: { temper: 5000, pride: 4000, trustInOthers: -4000 },
    dominantDrives: ["justice", "dignity", "influence"],
    highAptitudes: [],
    voice: "provocadora, sarcástica",
  },
  {
    id: "authoritarian",
    name: "líder autoritário",
    examples: ["chefe", "patriarca", "capitão"],
    traits: { pride: 7000, empathy: -3000 },
    dominantDrives: ["influence", "recognition", "predictability"],
    highAptitudes: [],
    voice: "imperativa",
  },
  {
    id: "shy_observer",
    name: "tímido(a) observador(a)",
    examples: ["aprendiz", "escriba", "filho quieto"],
    traits: { sociability: -7000, courage: -3000 },
    dominantDrives: ["company", "physical_safety", "curiosity"],
    highAptitudes: ["perceptiveness"],
    voice: "hesitante, fala baixo",
  },
  {
    id: "devout",
    name: "devoto(a)",
    examples: ["sacerdote", "beata", "monge"],
    traits: { honesty: 6000, empathy: 3000 },
    dominantDrives: ["purpose", "predictability", "justice"],
    highAptitudes: [],
    voice: "solene, moralista",
  },
  {
    id: "trickster",
    name: "malandro(a)",
    examples: ["trapaceiro", "golpista simpático"],
    traits: { honesty: -7000, humor: 6000 },
    dominantDrives: ["fun", "material_security", "influence"],
    highAptitudes: ["eloquence"],
    voice: "esperta, cheia de gírias do mundo",
  },
  {
    id: "elder",
    name: "ancião, anciã",
    examples: ["avó", "velho sábio"],
    traits: { selfControl: 5000, courage: 2000 },
    dominantDrives: ["intimacy", "purpose", "recognition"],
    highAptitudes: ["memory"],
    voice: "pausada, conta histórias",
  },
  {
    id: "child",
    name: "criança",
    examples: ["filho pequeno", "menina curiosa"],
    traits: { humor: 4000, selfControl: -6000 },
    dominantDrives: ["curiosity", "company", "physical_safety"],
    highAptitudes: [],
    voice: "simples, pergunta direto",
  },
  {
    id: "bitter_loner",
    name: "solitário(a) amargo(a)",
    examples: ["eremita", "viúvo ranzinza"],
    traits: { sociability: -6000, trustInOthers: -6000, temper: 3000 },
    dominantDrives: ["dignity", "physical_safety"],
    highAptitudes: [],
    voice: "seca, ácida",
  },
  {
    id: "bohemian",
    name: "boêmio(a)",
    examples: ["músico", "poeta", "bardo"],
    traits: { humor: 5000, sociability: 6000, selfControl: -3000 },
    dominantDrives: ["fun", "recognition", "desire"],
    highAptitudes: ["eloquence"],
    voice: "expressiva, poética",
  },
];
