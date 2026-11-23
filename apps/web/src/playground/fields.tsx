/**
 * Labelled form fields (overview §6): every input has a visible label tied to
 * it, so it is reachable by keyboard and named for assistive technology.
 */
import { useId, type JSX } from "react";

/** An option of a select. */
export interface Option {
  readonly value: string;
  readonly label: string;
}

interface SelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly Option[];
  readonly onChange: (value: string) => void;
}

/** A labelled select. */
export function SelectField({ label, value, options, onChange }: SelectProps): JSX.Element {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface InputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: "text" | "number" | "time";
  readonly min?: number;
  readonly max?: number;
}

/** A labelled input. */
export function InputField({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: InputProps): JSX.Element {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </div>
  );
}

/** The options of a catalog of named presets, in catalog order. */
export function optionsOf(
  catalog: readonly { readonly id: string; readonly name: string }[],
): Option[] {
  return catalog.map((entry) => ({ value: entry.id, label: entry.name }));
}

/** `value` as one of `ids`, or `undefined` when it is none of them. */
export function oneOf<T extends string>(ids: readonly T[], value: string): T | undefined {
  return ids.find((id) => id === value);
}

/** A change handler that passes on only values that are one of `ids`. */
export function picker<T extends string>(
  ids: readonly T[],
  onPick: (value: T) => void,
): (value: string) => void {
  return (value) => {
    const picked = oneOf(ids, value);
    if (picked !== undefined) {
      onPick(picked);
    }
  };
}
