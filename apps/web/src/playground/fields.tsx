/**
 * Labelled form fields (overview §6): every input has a visible label tied to
 * it, so it is reachable by keyboard and named for assistive technology.
 */
import { useEffect, useId, useRef, useState, type JSX, type RefObject } from "react";

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

const INTEGER = /^-?\d+$/;

/** The integer written in `text` when it lies in `min..max`, or `null`. */
export function integerIn(text: string, min: number, max: number): number | null {
  const value = Number(text);
  return INTEGER.test(text) && value >= min && value <= max ? value : null;
}

interface NumberProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onValue: (value: number) => void;
}

/**
 * A labelled integer field that keeps what is typed: an empty or invalid text
 * stays in the field, marked as an error, and only a valid integer in range
 * reaches `onValue`. A new `value` from outside replaces the text.
 */
export function NumberField({ label, value, min, max, onValue }: NumberProps): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const [draft, setDraft] = useState({ text: String(value), value });
  const current = draft.value === value ? draft : { text: String(value), value };
  if (current !== draft) {
    setDraft(current);
  }
  const invalid = integerIn(current.text, min, max) === null;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={current.text}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => {
          const text = event.target.value;
          const typed = integerIn(text, min, max);
          setDraft({ text, value: typed ?? value });
          if (typed !== null && typed !== value) {
            onValue(typed);
          }
        }}
      />
      {invalid ? (
        <p id={errorId} className="field-error">
          {`Use um número inteiro de ${String(min)} a ${String(max)}.`}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A ref whose element takes the focus when `active` holds, each time `key`
 * changes: moves the focus to the heading of a screen that just replaced
 * another, so keyboard and screen-reader users land on it.
 */
export function useFocus<T extends HTMLElement>(
  key: unknown,
  active: boolean,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) {
      ref.current?.focus();
    }
  }, [key, active]);
  return ref;
}
