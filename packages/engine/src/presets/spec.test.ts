import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  specAptitudes,
  specBodyNeeds,
  specBondAxes,
  specBondLabels,
  specDrives,
  specEmotions,
  specSignalCauses,
  specSignals,
  specTraits,
} from "../../test/support/spec-model.ts";
import { gridSize, withoutGrid } from "../../test/support/grid-walk.ts";
import {
  specActs,
  specRequestObjects,
  specTones,
  specTopicTypes,
} from "../../test/support/spec-acts.ts";
import { specDayStates, specHistoryEvents } from "../../test/support/spec-history.ts";
import {
  specAssociationTags,
  specBondArchetypes,
  specCharacterArchetypes,
  specDirectionalBondArchetypes,
  specGridLegend,
  specGridSizes,
  specPlaces,
  specTraversableCells,
  specWeathers,
} from "../../test/support/spec-presets.ts";
import { ACTS, actSchema } from "./acts.ts";
import { BODY_NEEDS, bodyNeedSchema } from "./body.ts";
import { BOND_ARCHETYPES, bondArchetypeSchema } from "./bond-archetypes.ts";
import { BOND_AXES, BOND_LABELS, bondAxisSchema, bondLabelSchema } from "./bonds.ts";
import { CHARACTER_ARCHETYPES, characterArchetypeSchema } from "./character-archetypes.ts";
import { DAY_STATES, dayStateSchema } from "./day-states.ts";
import { DRIVES, driveSchema } from "./drives.ts";
import { EMOTIONS, emotionSchema } from "./emotions.ts";
import { GRID_LEGEND, TRAVERSABLE_CELLS } from "./grid.ts";
import { HISTORY_EVENTS, historyEventSchema } from "./history-events.ts";
import { PLACES, placeSchema } from "./places.ts";
import { REQUEST_OBJECTS, requestObjectSchema } from "./request-objects.ts";
import { SIGNAL_CAUSE_IDS, SIGNALS, signalSchema } from "./signals.ts";
import { ASSOCIATION_TAGS, associationTagSchema } from "./tags.ts";
import { TONES, toneSchema } from "./tones.ts";
import { TOPIC_TYPES, topicTypeSchema } from "./topics.ts";
import { APTITUDES, aptitudeSchema, TRAITS, traitSchema } from "./traits.ts";
import { WEATHERS, weatherSchema } from "./weathers.ts";

/** The parsed form of a catalog, as the loader delivers it (defaults filled in). */
const parsed = (schema: z.ZodType, data: unknown): unknown => z.array(schema).parse(data);

describe("presets.md catalogs × preset data (CORE-03 acceptance)", () => {
  it("given the places when comparing with presets §2 then everything but the grid matches", () => {
    expect(z.array(placeSchema).parse(PLACES).map(withoutGrid)).toStrictEqual(specPlaces());
  });

  it("given the grid templates when measuring them then each has the size of presets §2", () => {
    expect(PLACES.map(gridSize)).toStrictEqual(specGridSizes());
  });

  it("given the grid legend when comparing with presets §2.1 then it matches", () => {
    expect(GRID_LEGEND).toStrictEqual(specGridLegend());
  });

  it("given the traversable cells when comparing with presets §2.1 then they match", () => {
    expect(TRAVERSABLE_CELLS).toStrictEqual(specTraversableCells());
  });

  it("given the weathers when comparing with presets §3 then they match", () => {
    expect(parsed(weatherSchema, WEATHERS)).toStrictEqual(specWeathers());
  });

  it("given the character archetypes when comparing with presets §5 then they match", () => {
    expect(parsed(characterArchetypeSchema, CHARACTER_ARCHETYPES)).toStrictEqual(
      specCharacterArchetypes(),
    );
  });

  it("given the bond archetypes when comparing with presets §6 then they match", () => {
    expect(parsed(bondArchetypeSchema, BOND_ARCHETYPES)).toStrictEqual(specBondArchetypes());
  });

  it("given the directional sentence of presets §6 when reading it then it names six archetypes", () => {
    expect(specDirectionalBondArchetypes()).toHaveLength(6);
  });

  it("given the history events when comparing with presets §7 then they match", () => {
    expect(parsed(historyEventSchema, HISTORY_EVENTS)).toStrictEqual(specHistoryEvents());
  });

  it("given the association tags when comparing with presets §8 then they match", () => {
    expect(parsed(associationTagSchema, ASSOCIATION_TAGS)).toStrictEqual(specAssociationTags());
  });

  it("given the day states when comparing with presets §9 then they match", () => {
    expect(parsed(dayStateSchema, DAY_STATES)).toStrictEqual(specDayStates());
  });
});

describe("simulation-model lists × preset data (CORE-03 acceptance)", () => {
  it("given the body needs when comparing with simulation-model §5.1 then they match", () => {
    expect(parsed(bodyNeedSchema, BODY_NEEDS)).toStrictEqual(specBodyNeeds());
  });

  it("given the emotions when comparing with simulation-model §5.2 then they match", () => {
    expect(parsed(emotionSchema, EMOTIONS)).toStrictEqual(specEmotions());
  });

  it("given the drives when comparing with simulation-model §5.3 then they match", () => {
    expect(parsed(driveSchema, DRIVES)).toStrictEqual(specDrives());
  });

  it("given the bond axes when comparing with simulation-model §5.4 then they match", () => {
    expect(parsed(bondAxisSchema, BOND_AXES)).toStrictEqual(specBondAxes());
  });

  it("given the bond labels when comparing with simulation-model §5.4 then they match", () => {
    expect(parsed(bondLabelSchema, BOND_LABELS)).toStrictEqual(specBondLabels());
  });

  it("given the traits when comparing with simulation-model §5.6 then they match", () => {
    expect(parsed(traitSchema, TRAITS)).toStrictEqual(specTraits());
  });

  it("given the aptitudes when comparing with simulation-model §5.6 then they match", () => {
    expect(parsed(aptitudeSchema, APTITUDES)).toStrictEqual(specAptitudes());
  });

  it("given the signal causes when comparing with simulation-model §7 then they match", () => {
    expect(SIGNAL_CAUSE_IDS).toStrictEqual(specSignalCauses());
  });

  it("given the signals when comparing with simulation-model §7 then they match", () => {
    expect(parsed(signalSchema, SIGNALS)).toStrictEqual(specSignals());
  });
});

describe("dialogue-acts catalogs × preset data (CORE-03 acceptance)", () => {
  it("given the acts when comparing with dialogue-acts §2 and §4 then they match", () => {
    expect(parsed(actSchema, ACTS)).toStrictEqual(specActs());
  });

  it("given the tones when comparing with dialogue-acts §3 then they match", () => {
    expect(parsed(toneSchema, TONES)).toStrictEqual(specTones());
  });

  it("given the topic types when comparing with dialogue-acts §4 then they match", () => {
    expect(parsed(topicTypeSchema, TOPIC_TYPES)).toStrictEqual(specTopicTypes());
  });

  it("given the request objects when comparing with dialogue-acts §4 then they match", () => {
    expect(parsed(requestObjectSchema, REQUEST_OBJECTS)).toStrictEqual(specRequestObjects());
  });
});
