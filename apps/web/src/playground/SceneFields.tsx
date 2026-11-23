/**
 * The scene part of the form (presets §2 to §4): seeds, place, grid template,
 * natural tag, weather and the start time.
 */
import { ASSOCIATION_TAG_IDS, dayPhase, PLACE_IDS, WEATHER_IDS } from "@ai-fantasy/engine";
import type { Dispatch, JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import { SEED_MAX } from "../engine/protocol.ts";
import { InputField, NumberField, oneOf, optionsOf, picker, SelectField } from "./fields.tsx";
import { DAY_PHASE_NAMES } from "./labels.ts";
import type { PlaygroundState } from "./model.ts";
import type { PlaygroundAction, SceneChanges } from "./reducer.ts";
import { minuteOf, randomSeed, timeOf } from "./values.ts";

interface Props {
  readonly state: PlaygroundState;
  readonly dispatch: Dispatch<PlaygroundAction>;
}

const NO_TAG = "";

function SeedField({
  label,
  value,
  onSeed,
}: {
  readonly label: string;
  readonly value: number;
  readonly onSeed: (seed: number) => void;
}): JSX.Element {
  return (
    <div className="seed">
      <NumberField label={label} value={value} min={0} max={SEED_MAX} onValue={onSeed} />
      <button
        type="button"
        onClick={() => {
          onSeed(randomSeed());
        }}
      >
        Sortear {label.toLowerCase()}
      </button>
    </div>
  );
}

/** The seeds of the cast and of the scene, editable and redrawable. */
export function SeedFields({ state, dispatch }: Props): JSX.Element {
  return (
    <fieldset>
      <legend>Seeds</legend>
      <SeedField
        label="Seed do elenco"
        value={state.seeds.castSeed}
        onSeed={(castSeed) => {
          dispatch({ type: "setSeeds", seeds: { castSeed } });
        }}
      />
      <SeedField
        label="Seed da cena"
        value={state.seeds.sceneSeed}
        onSeed={(sceneSeed) => {
          dispatch({ type: "setSeeds", seeds: { sceneSeed } });
        }}
      />
    </fieldset>
  );
}

function TimeField({ state, dispatch }: Props): JSX.Element {
  return (
    <div className="time">
      <InputField
        label="Horário"
        type="time"
        value={timeOf(state.startMinute)}
        onChange={(text) => {
          const startMinute = minuteOf(text);
          if (startMinute !== null) {
            dispatch({ type: "setScene", changes: { startMinute } });
          }
        }}
      />
      <p className="hint">Fase do dia: {DAY_PHASE_NAMES[dayPhase(state.startMinute)]}</p>
    </div>
  );
}

function WeatherField({ state, dispatch }: Props): JSX.Element {
  return (
    <SelectField
      label="Clima"
      value={state.weather}
      options={optionsOf(PRESETS.weathers)}
      onChange={picker(WEATHER_IDS, (weather) => {
        dispatch({ type: "setScene", changes: { weather } });
      })}
    />
  );
}

const TAG_OPTIONS = [{ value: NO_TAG, label: "nenhuma" }, ...optionsOf(PRESETS.associationTags)];

/** The place, its grid template, the natural tag, the weather and the time. */
export function SceneFields({ state, dispatch }: Props): JSX.Element {
  const scene = (changes: SceneChanges) => {
    dispatch({ type: "setScene", changes });
  };
  const places = optionsOf(PRESETS.places);
  return (
    <fieldset>
      <legend>Lugar, clima e horário</legend>
      <SelectField
        label="Lugar"
        value={state.place}
        options={places}
        onChange={picker(PLACE_IDS, (place) => {
          scene({ place });
        })}
      />
      <SelectField
        label="Gabarito da grade"
        value={state.grid}
        options={places}
        onChange={picker(PLACE_IDS, (grid) => {
          scene({ grid });
        })}
      />
      <SelectField
        label="Tag natural do lugar"
        value={state.naturalTag ?? NO_TAG}
        options={TAG_OPTIONS}
        onChange={(value) => {
          scene({ naturalTag: oneOf(ASSOCIATION_TAG_IDS, value) ?? null });
        }}
      />
      <WeatherField state={state} dispatch={dispatch} />
      <TimeField state={state} dispatch={dispatch} />
    </fieldset>
  );
}
