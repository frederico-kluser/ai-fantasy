/**
 * The grid template of the scene as the form shows it (presets §2.1): the
 * grid of a place and the cells where a character may start.
 */
import {
  cellPos,
  isPassable,
  parseGridSpec,
  type CellPos,
  type Grid,
  type PlaceId,
  type Presets,
} from "@ai-fantasy/engine";

/** The grid of the template of `place`, or `null` if it does not parse (never for the presets). */
export function gridOf(presets: Presets, place: PlaceId): Grid | null {
  const spec = presets.places.find((entry) => entry.id === place)?.grid;
  const grid = spec === undefined ? null : parseGridSpec(spec);
  return grid?.ok === true ? grid.value : null;
}

/** The cells a character may stand on, in index order (simulation-model §3.1). */
export function standingCells(grid: Grid): CellPos[] {
  return grid.cells.flatMap((type, index) => (isPassable(type) ? [cellPos(grid, index)] : []));
}

/** The symbols of the grid by row, with the number of each placed character over its cell. */
export function gridRows(
  rows: readonly string[],
  positions: readonly (CellPos | null)[],
): string[] {
  return rows.map((row, y) =>
    Array.from(row, (symbol, x) => {
      const at = positions.findIndex((pos) => pos?.x === x && pos.y === y);
      return at < 0 ? symbol : String(at + 1);
    }).join(""),
  );
}
