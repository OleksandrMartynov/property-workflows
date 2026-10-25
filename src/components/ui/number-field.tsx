"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { useFieldAria } from "./listbox-parts";
import { clampNumber, decimalsOf, parseDecimal, roundTo, toPlain } from "@/lib/numbers";
import { MinusGlyph, PlusGlyph, prefersReducedMotion, useControllable } from "./dt-shared";
import { AlertGlyph, fieldClass, fieldHeight } from "./input";

// Утримання кнопки: пауза, потім повтор, що пришвидшується; множник росте з часом (×2 після 1 с, ×5 після 2 с, ×10 після 3.2 с).
const HOLD_DELAY = 420;
const HOLD_INTERVAL = 150;
const HOLD_INTERVAL_MIN = 56;
const holdMultiplier = (ms: number) => (ms > 3200 ? 10 : ms > 2000 ? 5 : ms > 1000 ? 2 : 1);

export interface NumberFieldProps {
  id?: string;
  /** У форму йде число простим десятковим рядком (`1250.00`), без розділювачів тисяч. */
  name?: string;
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Крок для PgUp / PgDn і ⇧↑ ⇧↓. За замовчуванням step × 10. */
  largeStep?: number;
  /** Знаків після коми. За замовчуванням — як у кроку. */
  decimals?: number;
  placeholder?: string;
  /** `end` — «− +» справа в полі, `split` — «−» зліва й «+» справа, `none` — лише клавіатура. */
  stepper?: "end" | "split" | "none";
  align?: "left" | "right" | "center";
  /** Колесо миші змінює значення, коли поле у фокусі. За замовчуванням вимкнено. */
  allowWheel?: boolean;
  /** Після виходу з поля стискати значення до min / max (за замовчуванням лише позначає помилку). */
  clampOnBlur?: boolean;
  size?: "md" | "lg";
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

interface Money {
  currency: string;
  locale: string;
}

function NumberInput({
  id: idProp,
  name,
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  largeStep,
  decimals,
  placeholder,
  stepper = "end",
  align = "left",
  allowWheel,
  clampOnBlur,
  size = "md",
  disabled,
  readOnly,
  required,
  className,
  money,
  ...ariaProps
}: NumberFieldProps & { money?: Money }) {
  // Усередині Field — id, aria-describedby і aria-invalid з контексту (як Input і Combobox); явні пропси сильніші.
  const { id, aria } = useFieldAria(idProp, ariaProps);
  const dec = decimals ?? (money ? 2 : decimalsOf(step));
  const lo = min ?? -Infinity;
  const hi = max ?? Infinity;
  const big = largeStep ?? step * 10;
  const locale = money?.locale ?? "en-US";
  const nf = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec }), [locale, dec]);
  const cf = useMemo(
    () => (money ? new Intl.NumberFormat(locale, { style: "currency", currency: money.currency, minimumFractionDigits: dec, maximumFractionDigits: dec }) : null),
    [money, locale, dec],
  );
  const symbol = useMemo(() => cf?.formatToParts(0).find((p) => p.type === "currency")?.value ?? "", [cf]);

  const [current, setCurrent, valueRef] = useControllable<number | null>(value, defaultValue, onValueChange);
  const [draft, setDraft] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [holdingSide, setHoldingSide] = useState<-1 | 1 | 0>(0);

  const shown = draft ?? (current === null ? "" : nf.format(current));
  const outside = current !== null && (current < lo || current > hi);
  const invalid = aria["aria-invalid"] === true || aria["aria-invalid"] === "true" || outside;
  const atMin = current !== null && current <= lo;
  const atMax = current !== null && current >= hi;

  const nudge = (dir: number) => {
    const el = input.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== "function") return;
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-standard").trim() || "ease-out";
    el.animate([{ transform: `translateY(${-dir * 3}px)`, opacity: 0.55 }, { transform: "none", opacity: 1 }], { duration: 140, easing });
  };

  const commitValue = (next: number | null) => {
    setCurrent(next);
    // Під час набору поле показує сирий текст; після кроку — число з потрібною кількістю знаків.
    if (draft !== null || document.activeElement === input.current) setDraft(next === null ? "" : next.toFixed(dec));
  };

  const bump = (dir: 1 | -1, multiplier = 1, quiet = false) => {
    const now = valueRef.current;
    const start = now === null ? (Number.isFinite(lo) ? lo : 0) : roundTo(now + dir * step * multiplier, dec);
    const next = now === null ? start : clampNumber(start, lo, hi);
    commitValue(roundTo(next, dec));
    if (!quiet) nudge(dir);
  };

  const stopHold = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHoldingSide(0);
    setRate(1);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const startHold = (event: PointerEvent<HTMLButtonElement>, dir: 1 | -1) => {
    if (disabled || readOnly || event.button !== 0) return;
    if ((dir < 0 && atMin) || (dir > 0 && atMax)) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Синтетичний указівник (тести): без захоплення, зупинка — через pointerup.
    }
    setHoldingSide(dir);
    const t0 = event.timeStamp;
    let count = 0;
    bump(dir);
    const tick = () => {
      const now = valueRef.current;
      if (now !== null && ((dir < 0 && now <= lo) || (dir > 0 && now >= hi))) return stopHold();
      const factor = holdMultiplier(performance.now() - t0);
      bump(dir, factor, factor > 1);
      setRate(factor);
      count += 1;
      timer.current = window.setTimeout(tick, Math.max(HOLD_INTERVAL_MIN, HOLD_INTERVAL * 0.95 ** count));
    };
    timer.current = window.setTimeout(tick, HOLD_DELAY);
  };

  const commitText = (text: string) => {
    const parsed = parseDecimal(text);
    let next = parsed === null ? null : roundTo(parsed, dec);
    if (next !== null && clampOnBlur) next = clampNumber(next, lo, hi);
    setDraft(null);
    if (next !== valueRef.current) setCurrent(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly || event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case "ArrowUp": event.preventDefault(); bump(1, event.shiftKey ? big / step : 1); return;
      case "ArrowDown": event.preventDefault(); bump(-1, event.shiftKey ? big / step : 1); return;
      case "PageUp": event.preventDefault(); bump(1, big / step); return;
      case "PageDown": event.preventDefault(); bump(-1, big / step); return;
      case "Home": if (Number.isFinite(lo)) { event.preventDefault(); commitValue(lo); } return;
      case "End": if (Number.isFinite(hi)) { event.preventDefault(); commitValue(hi); } return;
      case "Enter": commitText(draft ?? shown); return;
    }
    if (event.key.length !== 1) return;
    const allowed = /\d/.test(event.key) || (event.key === "-" && lo < 0) || ((event.key === "." || event.key === ",") && dec > 0) || event.key === " ";
    if (!allowed) event.preventDefault();
  };

  // Колесо: потрібен не-passive слухач, інакше сторінка прокручується разом зі зміною значення.
  useEffect(() => {
    const el = input.current;
    if (!allowWheel || !el || disabled || readOnly) return;
    const onWheel = (event: WheelEvent) => {
      if (document.activeElement !== el) return;
      event.preventDefault();
      bump(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowWheel, disabled, readOnly, dec, lo, hi, step]);

  const split = stepper === "split";
  const stepButton = (dir: 1 | -1) => (
    <button
      key={dir}
      type="button"
      className="dt-step"
      data-side={dir < 0 ? "start" : "end"}
      data-holding={holdingSide === dir || undefined}
      tabIndex={-1}
      aria-hidden="true"
      aria-disabled={disabled || readOnly || (dir < 0 ? atMin : atMax) || undefined}
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => startHold(event, dir)}
      onPointerUp={stopHold}
      onPointerCancel={stopHold}
      onLostPointerCapture={stopHold}
    >
      {dir < 0 ? <MinusGlyph /> : <PlusGlyph />}
    </button>
  );

  const padding =
    stepper === "end" ? (invalid ? "pr-[5.5rem]" : "pr-[3.75rem]") : split ? "pl-10 pr-10" : invalid ? "pr-9" : undefined;
  const alertSide = stepper === "end" ? "right-16" : split ? "right-11" : "right-2.5";

  return (
    <div className={cn("dt-num", className)} data-layout={stepper === "split" ? "split" : undefined} data-filled={current !== null || undefined} data-disabled={disabled || undefined}>
      {money ? (
        <span className="dt-num__affix" aria-hidden="true">
          {symbol}
        </span>
      ) : null}
      <input
        ref={input}
        id={id}
        type="text"
        role="spinbutton"
        inputMode={dec > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        spellCheck={false}
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-valuemin={Number.isFinite(lo) ? lo : undefined}
        aria-valuemax={Number.isFinite(hi) ? hi : undefined}
        aria-valuenow={current ?? undefined}
        aria-valuetext={current === null ? undefined : cf ? cf.format(current) : nf.format(current)}
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
        aria-describedby={aria["aria-describedby"]}
        className={cn(
          fieldClass,
          fieldHeight[size],
          "dt-num__input",
          money ? "pl-[1.35rem]" : undefined,
          padding,
          align === "right" && "text-right",
          align === "center" && "text-center",
        )}
        onFocus={(event) => {
          if (disabled || readOnly) return;
          setDraft(current === null ? "" : current.toFixed(dec));
          const el = event.currentTarget;
          window.setTimeout(() => el.select(), 0);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = parseDecimal(event.target.value);
          setCurrent(parsed === null ? null : roundTo(parsed, dec));
        }}
        onBlur={(event) => commitText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {invalid ? <AlertGlyph className={cn("dt-num__alert", alertSide)} /> : null}
      {stepper === "end" ? (
        <span className="dt-steps">
          {stepButton(-1)}
          {stepButton(1)}
        </span>
      ) : split ? (
        <>
          {stepButton(-1)}
          {stepButton(1)}
        </>
      ) : null}
      {stepper !== "none" ? (
        <span className="dt-rate" data-on={rate > 1 || undefined} aria-hidden="true">
          ×{rate}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={toPlain(current, dec)} disabled={disabled} /> : null}
    </div>
  );
}

/** Число з кроком: ↑ ↓ (⇧ — ×10), PgUp / PgDn, Home / End, утримання «− +» із прискоренням; без рідних стрілок браузера. */
export function NumberField(props: NumberFieldProps) {
  return <NumberInput {...props} />;
}

export interface CurrencyFieldProps extends NumberFieldProps {
  /** Код ISO 4217. За замовчуванням EUR. */
  currency?: string;
  /** Локаль формату (роздільники). За замовчуванням en-IE: `€1,250.00`. */
  locale?: string;
}

/**
 * Сума: у спокої `€1,250.00` (символ — з `Intl.NumberFormat`, стоїть нерухомо ліворуч), у фокусі — чисті цифри для
 * редагування; розбір «1 250,5», «€1,250» при виході з поля. Табличні цифри; `align="right"` для стовпців сум.
 */
export function CurrencyField({ currency = "EUR", locale = "en-IE", ...props }: CurrencyFieldProps) {
  const money = useMemo(() => ({ currency, locale }), [currency, locale]);
  return <NumberInput {...props} money={money} />;
}
