/**
 * Drawing values with a range (presets §1 rule 4): uniform and inclusive, in
 * the stream given. A range of a single value draws nothing (presets §10.1).
 */
import type { CharacterId } from "../domain/ids.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { StreamName } from "../rng/state.ts";

/** An inclusive range of integers. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/** What a draw is for: the stream, the purpose of the record and the character it is about. */
export interface DrawLabel {
  readonly stream: StreamName;
  readonly purpose: string;
  readonly target: CharacterId;
}

/** A uniform integer in `range.min..range.max`; with `min === max`, `min` without drawing. */
export function drawInRange(drawer: Drawer, range: Range, label: DrawLabel): number {
  if (range.max <= range.min) {
    return range.min;
  }
  return (
    range.min + drawer.draw(label.stream, range.max - range.min + 1, label.purpose, label.target)
  );
}

/** The range `value ± spread`, limited to `low..high`. */
export function around(value: number, spread: number, low: number, high: number): Range {
  return { min: Math.max(low, value - spread), max: Math.min(high, value + spread) };
}
