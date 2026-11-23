/**
 * Helpers on grid templates for the preset tests (presets §2.1): sizes, places
 * without their template, and an independent walk that checks that every
 * suggested start is floor and reaches an exit through the four directions.
 */

interface Position {
  readonly x: number;
  readonly y: number;
}

interface Template {
  readonly rows: readonly string[];
  readonly exits: readonly Position[];
  readonly starts: readonly Position[];
}

interface PlaceLike {
  readonly id: string;
  readonly grid: Template;
}

/** Characters a character can walk through (simulation-model §3.1), written apart from the code. */
const WALKABLE = new Set([".", ",", "d", "D"]);

const STEPS: readonly Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const keyOf = ({ x, y }: Position): string => `${x},${y}`;

/** A place without its grid template, to compare with the table of presets §2. */
export function withoutGrid(place: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(place).filter(([key]) => key !== "grid"));
}

/** The id and the size (`W × H`) of the grid template of a place. */
export function gridSize({ id, grid }: PlaceLike) {
  const width = Math.max(...grid.rows.map((row) => row.length));
  return { id, width, height: grid.rows.length };
}

/** The suggested starts that are not floor (`.`). */
export function startsOffFloor({ grid }: PlaceLike): Position[] {
  return grid.starts.filter(({ x, y }) => grid.rows[y]?.[x] !== ".");
}

function reachesExit(template: Template, start: Position): boolean {
  const goals = new Set(template.exits.map(keyOf));
  const seen = new Set([keyOf(start)]);
  const queue = [start];
  for (let cell = queue.shift(); cell !== undefined; cell = queue.shift()) {
    if (goals.has(keyOf(cell))) {
      return true;
    }
    const around = STEPS.map((step) => ({ x: cell.x + step.x, y: cell.y + step.y }));
    for (const next of around) {
      if (WALKABLE.has(template.rows[next.y]?.[next.x] ?? "#") && !seen.has(keyOf(next))) {
        seen.add(keyOf(next));
        queue.push(next);
      }
    }
  }
  return false;
}

/** The suggested starts from which no exit can be reached walking in four directions. */
export function unreachableStarts({ grid }: PlaceLike): Position[] {
  return grid.starts.filter((start) => !reachesExit(grid, start));
}
