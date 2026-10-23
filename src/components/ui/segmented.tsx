"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  /** Лише декор 14 px (`aria-hidden` ставить сам компонент); підпис завжди поруч. */
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * Segmented control: `role="radiogroup"` з кнопками `role="radio"` (APG radio group): roving tabindex, стрілки
 * переміщують і вибирають, Home/End. Бігунок ковзає пружиною. `name` додає приховане поле — значення йде у форму.
 */
export function Segmented({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  size = "md",
  block = false,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: {
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  size?: "sm" | "md" | "lg";
  /** На всю ширину: пункти рівні. */
  block?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? options.find((o) => !o.disabled)?.value ?? "");
  const current = value ?? internal;
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  // Бігунок позиціонуємо в DOM (без стану): першу розкладку — без анімації, далі — пружиною.
  const place = useCallback((animate: boolean) => {
    const root = rootRef.current;
    const thumb = thumbRef.current;
    const on = root?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
    if (!root || !thumb || !on || !on.offsetWidth) return;
    if (!animate) thumb.style.transition = "none";
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.transform = `translateX(${on.offsetLeft}px)`;
    if (!animate) {
      void thumb.offsetWidth;
      thumb.style.transition = "";
    }
    root.dataset.placed = "";
  }, []);

  useLayoutEffect(() => {
    place(placed.current);
    placed.current = true;
  }, [place, current]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => place(false));
    observer?.observe(root);
    void document.fonts?.ready.then(() => place(false));
    return () => observer?.disconnect();
  }, [place]);

  const select = (option: SegmentedOption, focus = false) => {
    if (disabled || option.disabled) return;
    setInternal(option.value);
    onValueChange?.(option.value);
    if (focus) rootRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(option.value)}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = options.filter((o) => !o.disabled);
    const index = enabled.findIndex((o) => o.value === document.activeElement?.getAttribute("data-value"));
    if (disabled || index < 0) return;
    let next: SegmentedOption | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = enabled[(index + 1) % enabled.length];
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next, true);
  };

  const hasCurrent = options.some((o) => o.value === current && !o.disabled);
  const firstEnabled = options.find((o) => !o.disabled)?.value;

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-disabled={disabled || undefined}
      data-size={size === "md" ? undefined : size}
      data-block={block ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn("ctl-seg", className)}
      onKeyDown={onKeyDown}
    >
      <span ref={thumbRef} className="ctl-seg__thumb" aria-hidden="true" />
      {options.map((option) => {
        const checked = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-value={option.value}
            aria-checked={checked}
            aria-disabled={disabled || option.disabled || undefined}
            tabIndex={checked || (!hasCurrent && option.value === firstEnabled) ? 0 : -1}
            className="ctl-seg__btn"
            onClick={() => select(option)}
          >
            {option.icon ? <span aria-hidden="true" className="contents">{option.icon}</span> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
      {name ? <input type="hidden" name={name} value={current} disabled={disabled} /> : null}
    </div>
  );
}
