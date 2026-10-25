"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";
import { FieldMessage } from "./field";
import { mergeRefs } from "./merge-refs";

/** Галочка й риска змішаного стану малюються stroke-dashoffset (див. controls.css): клас `tick` / `dash`. */
export function CheckGlyph() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path className="tick" d="M2.5 6.25l2.25 2.25L9.5 3.5" pathLength={1} />
      <path className="dash" d="M3 6h6" pathLength={1} />
    </svg>
  );
}

export type CheckboxProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  label?: ReactNode;
  description?: ReactNode;
  /** Змішаний стан (батьківський пункт секції): `aria-checked="mixed"` виставляє сам браузер. */
  indeterminate?: boolean;
  /** `done` — зелений (виконана задача); за замовчуванням акцентний. */
  tone?: "primary" | "done";
  invalid?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * Checkbox: справжній `<input type="checkbox">` (Space, `name`/`value`/`checked` працюють у формі та server actions),
 * поверх нього наша коробка з галочкою, що домальовується. Без `label` потрібен `aria-label`.
 */
export function Checkbox({ label, description, indeterminate = false, tone = "primary", invalid, onCheckedChange, className, id, ref, onChange, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const local = useRef<HTMLInputElement>(null);
  const [pop, setPop] = useState(false);

  // indeterminate — лише властивість DOM; після кліку браузер її скидає, тож перевіряємо щоразу
  useEffect(() => {
    if (local.current) local.current.indeterminate = indeterminate;
  });

  const describedBy = [props["aria-describedby"], description ? `${inputId}-desc` : null].filter(Boolean).join(" ") || undefined;

  return (
    <label className={cn("ctl-check", className)} data-tone={tone === "done" ? "done" : undefined} data-invalid={invalid ? "" : undefined}>
      <input
        {...props}
        ref={mergeRefs(local, ref)}
        id={inputId}
        type="checkbox"
        className="ctl-check__input"
        aria-invalid={invalid ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        onChange={(event) => {
          setPop(true);
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
      />
      <span className="ctl-check__box" aria-hidden="true" data-pop={pop ? "" : undefined} onAnimationEnd={() => setPop(false)}>
        <CheckGlyph />
      </span>
      {label || description ? (
        <span className="ctl-check__text">
          {label ? <span className="ctl-check__label">{label}</span> : null}
          {description ? (
            <span id={`${inputId}-desc`} className="ctl-check__desc">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}

export interface CheckboxOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/**
 * Група чекбоксів у `<fieldset>`: окремий `name` для кожного значення (FormData дасть кілька полів), необов'язковий
 * батьківський пункт «вибрати все» у змішаному стані й підсумок на кшталт «2 of 3 done» (`summary`).
 */
export function CheckboxGroup({
  legend,
  options,
  name,
  value,
  defaultValue = [],
  onValueChange,
  parentLabel,
  summary,
  direction = "column",
  disabled,
  hint,
  error,
  tone,
  className,
  ...rest
}: {
  legend?: ReactNode;
  options: CheckboxOption[];
  name?: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Підпис батьківського чекбокса «вибрати все»; без нього батька немає. */
  parentLabel?: ReactNode;
  summary?: (selected: number, total: number) => string;
  direction?: "column" | "row";
  disabled?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  tone?: "primary" | "done";
  className?: string;
  "aria-label"?: string;
}) {
  const id = useId();
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const set = (next: string[]) => {
    setInternal(next);
    onValueChange?.(next);
  };

  const enabled = options.filter((o) => !o.disabled && !disabled);
  const selectedEnabled = enabled.filter((o) => selected.includes(o.value)).length;
  const all = enabled.length > 0 && selectedEnabled === enabled.length;
  const some = selectedEnabled > 0 && !all;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  const toggleAll = (checked: boolean) => {
    const locked = selected.filter((v) => !enabled.some((o) => o.value === v));
    set(checked ? [...locked, ...enabled.map((o) => o.value)] : locked);
  };

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <fieldset className="ctl-choices" aria-invalid={error ? true : undefined} aria-describedby={describedBy} disabled={disabled} {...rest}>
        {legend ? <legend className="ctl-choices__legend">{legend}</legend> : null}
        {parentLabel ? <Checkbox label={parentLabel} tone={tone} checked={all} indeterminate={some} onCheckedChange={toggleAll} /> : null}
        <div className="ctl-choices" data-dir={direction} style={parentLabel ? { paddingLeft: "1.5rem" } : undefined}>
          {options.map((option) => (
            <Checkbox
              key={option.value}
              name={name}
              value={option.value}
              label={option.label}
              description={option.description}
              disabled={option.disabled}
              tone={tone}
              invalid={Boolean(error)}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => set(checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))}
            />
          ))}
          {summary ? (
            <p className="text-meta text-muted-foreground tabular" aria-live="polite">
              {summary(selectedEnabled, enabled.length)}
            </p>
          ) : null}
        </div>
      </fieldset>
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
