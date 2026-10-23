"use client";

import { createContext, useContext, useId, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";
import { FieldMessage } from "./field";

interface RadioContext {
  name: string;
  value: string | undefined;
  defaultValue: string | undefined;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  onSelect: (value: string) => void;
}
const RadioGroupContext = createContext<RadioContext | null>(null);

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/**
 * Група радіо в `<fieldset role="radiogroup">`: справжні `<input type="radio">` з одним `name`, тож браузер сам дає
 * roving tabindex (Tab заходить на вибраний пункт), стрілки (переміщують і вибирають, з обходом по колу) та Space.
 * Значення йде у форму під `name`. Без `legend` потрібен `aria-label`.
 */
export function RadioGroup({
  name,
  legend,
  value,
  defaultValue,
  onValueChange,
  options,
  direction = "column",
  disabled = false,
  required = false,
  hint,
  error,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  name: string;
  legend?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Короткий запис: замість дітей `<Radio>`. */
  options?: RadioOption[];
  direction?: "column" | "row";
  disabled?: boolean;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  const context: RadioContext = {
    name,
    value,
    defaultValue,
    disabled,
    invalid: Boolean(error),
    required,
    onSelect: (next) => onValueChange?.(next),
  };

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <RadioGroupContext.Provider value={context}>
        <fieldset
          className="ctl-choices"
          data-dir={direction}
          role="radiogroup"
          aria-label={legend ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
        >
          {legend ? <legend className="ctl-choices__legend">{legend}</legend> : null}
          {options?.map((option) => (
            <Radio key={option.value} {...option} />
          ))}
          {children}
        </fieldset>
      </RadioGroupContext.Provider>
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}

/** Один пункт групи: `value`, підпис і необов'язковий опис під ним. */
export function Radio({
  value,
  label,
  description,
  disabled,
  className,
  id,
  ...props
}: Omit<ComponentProps<"input">, "type" | "name" | "value" | "checked" | "defaultChecked" | "onChange"> & {
  value: string;
  label: ReactNode;
  description?: ReactNode;
}) {
  const group = useContext(RadioGroupContext);
  const autoId = useId();
  const inputId = id ?? autoId;
  const [pop, setPop] = useState(false);
  const controlled = group?.value !== undefined;

  return (
    <label className={cn("ctl-radio", className)} data-invalid={group?.invalid ? "" : undefined}>
      <input
        {...props}
        id={inputId}
        type="radio"
        className="ctl-radio__input"
        name={group?.name}
        value={value}
        checked={controlled ? group?.value === value : undefined}
        defaultChecked={controlled ? undefined : group?.defaultValue === value}
        disabled={disabled || group?.disabled}
        required={group?.required}
        aria-describedby={[props["aria-describedby"], description ? `${inputId}-desc` : null].filter(Boolean).join(" ") || undefined}
        onChange={() => {
          setPop(true);
          group?.onSelect(value);
        }}
      />
      <span className="ctl-radio__box" aria-hidden="true" data-pop={pop ? "" : undefined} onAnimationEnd={() => setPop(false)} />
      <span className="ctl-radio__text">
        <span className="ctl-check__label">{label}</span>
        {description ? (
          <span id={`${inputId}-desc`} className="ctl-check__desc">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
