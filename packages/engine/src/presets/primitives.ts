/**
 * Shared pieces of the preset schemas (presets §1): integer bp scales, display
 * texts, ranges and lists without repeats. Every object schema of the presets
 * is strict (`z.strictObject`), so an unknown or misspelled field is an error.
 */
import { z } from "zod";

import { BIPOLAR_MIN, BP_MAX, toBipolarBp, toBp } from "../domain/bp.ts";

/** A unipolar value: an integer in `0..10000` (simulation-model §2), typed as `Bp`. */
export const bpSchema = z.int().min(0).max(BP_MAX).transform(toBp);

/** A bipolar value: an integer in `-10000..10000` (simulation-model §2), typed as `BipolarBp`. */
export const bipolarSchema = z.int().min(BIPOLAR_MIN).max(BP_MAX).transform(toBipolarBp);

/** A display name or description in Portuguese (presets §1): never empty. */
export const textSchema = z.string().min(1);

/** Display texts, such as the examples of a place: at least one. */
export const textListSchema = z.array(textSchema).min(1);

const RANGE_ORDER = { error: "min is above max" };

function isOrdered(range: { readonly min: number; readonly max: number }): boolean {
  return range.min <= range.max;
}

/**
 * An inclusive range drawn uniformly (presets §1 rule 4), on the unipolar
 * scale; a fixed value has `min === max`.
 */
export const bpRangeSchema = z
  .strictObject({ min: bpSchema, max: bpSchema })
  .refine(isOrdered, RANGE_ORDER);

/** An inclusive range on the bipolar scale; a fixed value has `min === max`. */
export const bipolarRangeSchema = z
  .strictObject({ min: bipolarSchema, max: bipolarSchema })
  .refine(isOrdered, RANGE_ORDER);

/** A list of `item` without repeats: each repeat is reported at its position. */
export function uniqueList<T extends z.ZodType<string>>(item: T) {
  return z.array(item).superRefine((items, context) => {
    items.forEach((value, index) => {
      if (items.indexOf(value) < index) {
        context.addIssue({ code: "custom", path: [index], message: `${value} is repeated` });
      }
    });
  });
}

/** Recursively read-only version of a plain data type: presets are never mutated. */
export type DeepReadonly<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** The data of a catalog as written in the code, before validation (defaults may be left out). */
export type CatalogInput<S extends z.ZodType> = readonly DeepReadonly<z.input<S>>[];

/** One validated preset of a catalog, with every default filled in. */
export type PresetOf<S extends z.ZodType> = DeepReadonly<z.output<S>>;
