/**
 * Grid templates of the places (presets §2.1): the default grid of each place,
 * with its exits, roofed cells and suggested starting positions. The runtime
 * grid belongs to the space module; this schema checks the same rules on the
 * preset data, so a broken template never loads.
 */
import { z } from "zod";

import { GRID_MAX } from "../domain/constants.ts";
import type { DeepReadonly } from "./primitives.ts";

/** Cell type of each character of a template row (presets §2.1, simulation-model §3.1). */
export const GRID_LEGEND: Readonly<Record<string, string>> = {
  ".": "FLOOR",
  ",": "ROUGH",
  d: "DOOR_OPEN",
  D: "DOOR_CLOSED",
  "=": "WINDOW",
  o: "LOW_OBSTACLE",
  "#": "WALL",
};

/** Cell types a character can walk through (simulation-model §3.1). */
export const TRAVERSABLE_CELLS: readonly string[] = ["FLOOR", "ROUGH", "DOOR_OPEN", "DOOR_CLOSED"];

/** Suggested starting positions per template: the cast has up to 8 characters (presets §10). */
const MIN_STARTS = 8;

const MASK_CELLS = ["r", "."];

const positionSchema = z.strictObject({ x: z.int().min(0), y: z.int().min(0) });

interface Position {
  readonly x: number;
  readonly y: number;
}

interface TemplateShape {
  readonly rows: readonly string[];
  readonly exits: readonly Position[];
  readonly roofed: string | readonly string[];
  readonly starts: readonly Position[];
}

interface Issue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

function widthOf(rows: readonly string[]): number {
  return Math.max(...rows.map((row) => row.length));
}

function rowIssue(row: string, y: number, width: number): Issue[] {
  const unknown = Array.from(row).find((char) => GRID_LEGEND[char] === undefined);
  if (unknown !== undefined) {
    return [{ path: ["rows", y], message: `unknown cell character: ${unknown}` }];
  }
  const message = `row has ${row.length} cells; the widest row has ${width}`;
  return row.length === width ? [] : [{ path: ["rows", y], message }];
}

function cellProblem(rows: readonly string[], { x, y }: Position): string | undefined {
  const char = rows[y]?.[x];
  if (char === undefined) {
    return "outside the grid";
  }
  const type = GRID_LEGEND[char];
  return TRAVERSABLE_CELLS.some((walkable) => walkable === type)
    ? undefined
    : `not traversable: ${String(type)}`;
}

function isOnBorder(rows: readonly string[], { x, y }: Position): boolean {
  return x === 0 || y === 0 || x === widthOf(rows) - 1 || y === rows.length - 1;
}

function exitProblem(rows: readonly string[], exit: Position): string | undefined {
  return cellProblem(rows, exit) ?? (isOnBorder(rows, exit) ? undefined : "not on the border");
}

function positionIssues(
  field: "exits" | "starts",
  positions: readonly Position[],
  problemOf: (position: Position) => string | undefined,
): Issue[] {
  const keys = positions.map(({ x, y }) => `${x}, ${y}`);
  return positions.flatMap((position, index) => {
    const key = keys[index] ?? "";
    const message = keys.indexOf(key) < index ? `repeats the cell (${key})` : problemOf(position);
    return message === undefined ? [] : [{ path: [field, index], message }];
  });
}

function maskIssues(mask: readonly string[], rows: readonly string[]): Issue[] {
  if (mask.length !== rows.length) {
    return [
      { path: ["roofed"], message: `mask has ${mask.length} rows; the grid has ${rows.length}` },
    ];
  }
  const width = widthOf(rows);
  return mask.flatMap((row, y) => {
    if (row.length !== width) {
      return [
        { path: ["roofed", y], message: `mask row has ${row.length} cells; the grid has ${width}` },
      ];
    }
    const known = Array.from(row).every((char) => MASK_CELLS.includes(char));
    return known ? [] : [{ path: ["roofed", y], message: "mask cells are r (roofed) or . (open)" }];
  });
}

/** Every rule of presets §2.1 that a template breaks, rows first. */
function templateIssues(template: TemplateShape): Issue[] {
  const { rows, roofed } = template;
  const width = widthOf(rows);
  const rowProblems = rows.flatMap((row, y) => rowIssue(row, y, width));
  if (rowProblems.length > 0) {
    return rowProblems;
  }
  return [
    ...positionIssues("exits", template.exits, (exit) => exitProblem(rows, exit)),
    ...positionIssues("starts", template.starts, (start) => cellProblem(rows, start)),
    ...(typeof roofed === "string" ? [] : maskIssues(roofed, rows)),
  ];
}

/**
 * Schema of a grid template (presets §2.1): `rows` of legend characters,
 * `exits` on traversable border cells, `roofed` cells (`"ALL"`, `"NONE"` or a
 * mask of `r` and `.`) and at least 8 distinct traversable `starts`.
 */
export const gridTemplateSchema = z
  .strictObject({
    rows: z.array(z.string().min(1).max(GRID_MAX)).min(1).max(GRID_MAX),
    exits: z.array(positionSchema).min(1),
    roofed: z.union([z.enum(["ALL", "NONE"]), z.array(z.string())]),
    starts: z.array(positionSchema).min(MIN_STARTS),
  })
  .superRefine((template, context) => {
    for (const issue of templateIssues(template)) {
      context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
    }
  });

/** A grid template as written in the data, before validation. */
export type GridTemplateInput = DeepReadonly<z.input<typeof gridTemplateSchema>>;

/**
 * A validated grid template (presets §2.1); the same shape as the `GridSpec`
 * of the space module (`rows`, `exits`, `roofed`, `starts`).
 */
export type GridTemplate = DeepReadonly<z.output<typeof gridTemplateSchema>>;
