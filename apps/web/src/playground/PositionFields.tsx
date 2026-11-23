/**
 * Where everyone starts and who the player is (presets §2.1 and §10.1): a
 * cell chosen by hand or drawn at the opening, over the chosen grid template.
 */
import type { CellPos } from "@ai-fantasy/engine";
import type { Dispatch, JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import { SelectField, type Option } from "./fields.tsx";
import { gridOf, gridRows, standingCells } from "./grid.ts";
import { displayName } from "./labels.ts";
import type { PlaygroundState } from "./model.ts";
import type { PlaygroundAction } from "./reducer.ts";

interface Props {
  readonly state: PlaygroundState;
  readonly dispatch: Dispatch<PlaygroundAction>;
}

const DRAWN = "";
const NOBODY = "";

function cellValue(pos: CellPos | null | undefined): string {
  return pos === null || pos === undefined ? DRAWN : `${String(pos.x)},${String(pos.y)}`;
}

/** The cell of a select value (`x,y`), or `null` to draw it. */
export function cellOf(value: string): CellPos | null {
  const match = /^(\d+),(\d+)$/.exec(value);
  return match === null ? null : { x: Number(match[1]), y: Number(match[2]) };
}

function GridView({ state }: { readonly state: PlaygroundState }): JSX.Element {
  const template = PRESETS.places.find((place) => place.id === state.grid)?.grid;
  const rows = gridRows(template?.rows ?? [], state.positions);
  return (
    <figure>
      <pre className="grid" aria-hidden="true">
        {rows.join("\n")}
      </pre>
      <figcaption>Os números marcam as posições escolhidas à mão.</figcaption>
    </figure>
  );
}

function cellOptions(state: PlaygroundState): Option[] {
  const grid = gridOf(PRESETS, state.grid);
  const cells = grid === null ? [] : standingCells(grid);
  return [
    { value: DRAWN, label: "sortear na abertura" },
    ...cells.map((pos) => ({
      value: cellValue(pos),
      label: `(${String(pos.x)}, ${String(pos.y)})`,
    })),
  ];
}

function PlayerField({ state, dispatch, names }: Props & { readonly names: readonly string[] }) {
  const people: Option[] = [
    { value: NOBODY, label: "ninguém (só assistir)" },
    ...names.map((name, id) => ({ value: String(id), label: name })),
  ];
  return (
    <SelectField
      label="Personagem do jogador"
      value={state.player === null ? NOBODY : String(state.player)}
      options={people}
      onChange={(value) => {
        dispatch({ type: "setPlayer", player: value === NOBODY ? null : Number(value) });
      }}
    />
  );
}

/** The start cell of each character and the player's character. */
export function PositionFields({ state, dispatch }: Props): JSX.Element {
  const cells = cellOptions(state);
  const names = state.characters.map((character, id) => displayName(character.name, id));
  return (
    <fieldset>
      <legend>Posições e jogador</legend>
      <GridView state={state} />
      {names.map((name, index) => (
        <SelectField
          key={index}
          label={`Posição de ${name}`}
          value={cellValue(state.positions[index])}
          options={cells}
          onChange={(value) => {
            dispatch({ type: "setPosition", index, position: cellOf(value) });
          }}
        />
      ))}
      <PlayerField state={state} dispatch={dispatch} names={names} />
    </fieldset>
  );
}
