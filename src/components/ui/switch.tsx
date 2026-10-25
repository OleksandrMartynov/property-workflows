"use client";

import { useId, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";

export type SwitchProps = Omit<ComponentProps<"input">, "type" | "size" | "role"> & {
  label?: ReactNode;
  description?: ReactNode;
  /** Де підпис: справа (за замовчуванням) чи зліва, тоді перемикач притиснутий до правого краю. */
  labelPosition?: "right" | "left";
  /** Зовнішній стан «зберігається». Якщо `onCheckedChange` повертає Promise — стан виставляється сам. */
  busy?: boolean;
  /** Може повернути Promise: на час очікування на кульці крутиться дуга (`aria-busy`), а за відмови (reject) значення повертається. */
  onCheckedChange?: (checked: boolean) => void | Promise<unknown>;
};

/**
 * Перемикач `role="switch"` на справжньому `<input type="checkbox">`: Space і Enter, `name`/`value` у формі.
 * Асинхронна зміна не блокує перемикач — він лише показує, що зберігається.
 */
export function Switch({ label, description, labelPosition = "right", busy = false, onCheckedChange, checked, defaultChecked, className, id, onChange, onKeyDown, ...props }: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const controlled = checked !== undefined;
  const [inner, setInner] = useState(Boolean(defaultChecked));
  const [pending, setPending] = useState(false);
  const on = controlled ? checked : inner;
  const isBusy = busy || pending;

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    onChange?.(event);
    if (!controlled) setInner(next);
    const result = onCheckedChange?.(next);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setPending(true);
      try {
        await result;
      } catch {
        if (!controlled) setInner(!next);
      } finally {
        setPending(false);
      }
    }
  };

  return (
    <label className={cn("ctl-switch", labelPosition === "left" && "ctl-switch--lead", className)} data-busy={isBusy ? "" : undefined}>
      <input
        {...props}
        id={inputId}
        type="checkbox"
        role="switch"
        className="ctl-switch__input"
        checked={on}
        aria-busy={isBusy || undefined}
        aria-describedby={[props["aria-describedby"], description ? `${inputId}-desc` : null].filter(Boolean).join(" ") || undefined}
        onChange={handleChange}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // Для перемикача Enter теж перемикає (а не надсилає форму)
          if (event.key === "Enter" && !event.defaultPrevented) {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      />
      <span className="ctl-switch__track" aria-hidden="true">
        <span className="ctl-switch__thumb" />
      </span>
      {label || description ? (
        <span className="ctl-switch__text">
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
