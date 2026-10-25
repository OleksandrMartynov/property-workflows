"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";
import { useFieldControl } from "./field";
import { mergeRefs } from "./merge-refs";

/**
 * Межа поля — токен `input` (≥ 3:1 до тла). Наведення на крок темнить межу, фокус — межа `ring` плюс 2px кільце
 * всередині межі (`outline-offset: -1px`), помилка — межа `destructive`. Вимкнене поле — приглушене тло й текст;
 * лише для читання — легка заливка. Спільний вигляд для `Input`, `Textarea`, `PasswordInput` і тригера `Select`.
 */
export const fieldClass =
  "w-full rounded-sm border border-input bg-field px-3 text-foreground caret-primary placeholder:text-muted-foreground transition-ui hover:border-(color:--border-hover) focus-visible:border-ring focus-visible:-outline-offset-1 aria-invalid:border-destructive aria-invalid:hover:border-destructive [&:not(button)]:read-only:bg-muted/50 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:placeholder:text-control-disabled disabled:hover:border-border [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none";

export const fieldHeight = { md: "h-8 text-body", lg: "h-11 text-body", xl: "h-12 text-title placeholder:font-normal" } as const;

export function AlertGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4 shrink-0 text-destructive", className)}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.8v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

function ClearGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Скільки 24px-значків займає правий край: помилка, «очистити», власний `trailing`. Місце резервуємо наперед, щоб текст не стрибав. */
const padRight = ["pr-3", "pr-9", "pr-[3.75rem]", "pr-[5.25rem]"] as const;

const isTrue = (value: ComponentProps<"input">["aria-invalid"]) => value === true || value === "true";

/** Записує значення так, щоб React побачив подію (керовані й некеровані поля), — для кнопки «очистити». */
function setNativeValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Текстове поле. `leading` — іконка зліва (лише візуальна, `aria-hidden`), `trailing` — елемент справа (кнопка
 * «око», підказка). Помилка (`aria-invalid`, або помилка в `Field`) сама додає значок оклику, а `clearable` — кнопку «×»,
 * що з'являється, коли в полі є текст. Усередині `Field` id та aria-* підставляються з контексту.
 */
export function Input({
  className,
  type = "text",
  size = "md",
  leading,
  trailing,
  clearable = false,
  clearLabel = "Clear",
  ref,
  id,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "size"> & {
  size?: keyof typeof fieldHeight;
  leading?: ReactNode;
  trailing?: ReactNode;
  clearable?: boolean;
  clearLabel?: string;
}) {
  const field = useFieldControl();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(() => String(props.defaultValue ?? "").length > 0);
  const filled = props.value !== undefined ? String(props.value).length > 0 : typed;

  const invalidProp = props["aria-invalid"];
  const invalid = invalidProp === undefined ? Boolean(field?.invalid) : isTrue(invalidProp);
  const showClear = clearable && filled && !props.disabled && !props.readOnly;
  const slots = Number(showClear) + Number(invalid) + Number(Boolean(trailing));

  return (
    <div ref={wrapRef} data-ctl-input="" className="group relative">
      {leading ? (
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-ui group-focus-within:text-foreground [&>svg]:size-4">
          {leading}
        </span>
      ) : null}
      <input
        ref={ref}
        id={id ?? field?.id}
        type={type}
        className={cn(fieldClass, fieldHeight[size], leading ? "pl-9" : undefined, padRight[Math.min(slots, 3)], className)}
        {...props}
        aria-invalid={invalidProp ?? (field?.invalid ? true : undefined)}
        aria-describedby={props["aria-describedby"] ?? field?.describedBy}
        aria-required={props["aria-required"] ?? (field?.required ? true : undefined)}
        onChange={(event) => {
          setTyped(event.target.value.length > 0);
          onChange?.(event);
        }}
      />
      {slots > 0 ? (
        <span className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {invalid ? (
            <span className="ctl-pop grid size-6 place-items-center">
              <AlertGlyph />
            </span>
          ) : null}
          {showClear ? (
            <button
              type="button"
              aria-label={clearLabel}
              title={clearLabel}
              className="ctl-iconbtn ctl-pop"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const input = wrapRef.current?.querySelector("input");
                if (!input) return;
                setNativeValue(input, "");
                input.focus();
              }}
            >
              <ClearGlyph />
            </button>
          ) : null}
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

const TEXTAREA_MAX_ROWS = 6;

/**
 * Багаторядкове поле без системного «хвостика» зміни розміру: росте разом із текстом до `maxRows` (6) рядків, далі
 * прокручується. Початкова висота — `rows` (2). Під `Field` дає лічильник символів через `counter`.
 */
export function Textarea({
  className,
  rows = 2,
  maxRows = TEXTAREA_MAX_ROWS,
  ref,
  id,
  onInput,
  ...props
}: ComponentProps<"textarea"> & { maxRows?: number }) {
  const field = useFieldControl();
  const local = useRef<HTMLTextAreaElement>(null);
  const merged = useMemo(() => mergeRefs(local, ref), [ref]);

  const fit = useCallback(() => {
    const el = local.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight) || 20;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const max = line * maxRows + padding + border;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight + border, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight + border > max ? "auto" : "hidden";
  }, [maxRows]);

  useLayoutEffect(fit, [fit, props.value]);

  // Зміна ширини міняє перенос рядків — перераховуємо висоту.
  useEffect(() => {
    const el = local.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        fit();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const invalidProp = props["aria-invalid"];
  return (
    <textarea
      ref={merged}
      id={id ?? field?.id}
      rows={rows}
      className={cn(fieldClass, "block resize-none py-2 text-body", className)}
      {...props}
      aria-invalid={invalidProp ?? (field?.invalid ? true : undefined)}
      aria-describedby={props["aria-describedby"] ?? field?.describedBy}
      aria-required={props["aria-required"] ?? (field?.required ? true : undefined)}
      onInput={(event) => {
        fit();
        onInput?.(event);
      }}
    />
  );
}

