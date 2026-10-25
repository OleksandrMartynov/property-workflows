"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";

type SliderValue = number | [number, number];

export interface SliderProps {
  /** Видимий підпис над рейкою; без нього потрібен `aria-label`. */
  label?: ReactNode;
  "aria-label"?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Число — один бігунок, пара — діапазон. */
  value?: SliderValue;
  defaultValue?: SliderValue;
  onValueChange?: (value: SliderValue) => void;
  /** Як показувати значення (бульбашка, праворуч від підпису, шкала): за замовчуванням число. */
  format?: (value: number) => string;
  /** Як читач екрана озвучує значення (`aria-valuetext`): за замовчуванням як `format`. */
  valueText?: (value: number) => string;
  /** Назва поля форми: для діапазону йдуть `<name>_min` і `<name>_max`. */
  name?: string;
  disabled?: boolean;
  /** Бульбашка зі значенням постійно (інакше — при наведенні, фокусі й перетягуванні). */
  bubble?: boolean;
  showScale?: boolean;
  tone?: "primary" | "ai";
  className?: string;
}

/**
 * Slider без системного вигляду `<input type="range">`: `role="slider"` на кожному бігунку (APG), стрілки ±step,
 * PgUp/PgDn ±10 кроків, Home/End; перетягування вказівником із захопленням. Одинарний і діапазонний; значення йдуть у
 * форму через приховані поля.
 */
export function Slider({
  label,
  "aria-label": ariaLabel,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  format = String,
  valueText,
  name,
  disabled = false,
  bubble = false,
  showScale = false,
  tone = "primary",
  className,
}: SliderProps) {
  const id = useId();
  const initial = value ?? defaultValue ?? min;
  const range = Array.isArray(initial);
  const [internal, setInternal] = useState<number[]>(Array.isArray(initial) ? [...initial] : [initial]);
  const vals = value === undefined ? internal : Array.isArray(value) ? value : [value];
  const [dragging, setDragging] = useState(-1);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([]);

  const decimals = (String(step).split(".")[1] ?? "").length;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const snap = (v: number) => Number(clamp(Math.round((v - min) / step) * step + min, min, max).toFixed(decimals));
  const percent = (v: number) => (max === min ? 0 : (v - min) / (max - min));

  const commit = (index: number, raw: number) => {
    let next = snap(raw);
    if (range) next = index === 0 ? Math.min(next, vals[1]) : Math.max(next, vals[0]);
    if (next === vals[index]) return;
    const updated = [...vals];
    updated[index] = next;
    setInternal(updated);
    onValueChange?.(range ? [updated[0], updated[1]] : updated[0]);
  };

  const fromX = (clientX: number) => {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return min;
    return min + clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const target = fromX(event.clientX);
    let index = 0;
    if (range) {
      const d0 = Math.abs(target - vals[0]);
      const d1 = Math.abs(target - vals[1]);
      index = d0 < d1 ? 0 : d1 < d0 ? 1 : target < vals[0] ? 0 : 1;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(index);
    thumbRefs.current[index]?.focus({ preventScroll: true });
    commit(index, target);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging >= 0) commit(dragging, fromX(event.clientX));
  };
  const endDrag = () => setDragging(-1);

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = step * 10;
    let next = vals[index];
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next += step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next -= step;
        break;
      case "PageUp":
        next += big;
        break;
      case "PageDown":
        next -= big;
        break;
      case "Home":
        next = range && index ? vals[0] : min;
        break;
      case "End":
        next = range && !index ? vals[1] : max;
        break;
      default:
        return;
    }
    event.preventDefault();
    commit(index, next);
  };

  const labelId = `${id}-label`;
  const rangeNames = ["Minimum", "Maximum"];
  const style = { "--p0": range ? percent(vals[0]) : 0, "--p1": percent(vals[vals.length - 1]) } as CSSProperties;

  return (
    <div className={cn("ctl-slider-field", className)}>
      {label ? (
        <div className="ctl-slider-field__head">
          <span id={labelId} className="text-label font-medium text-foreground">
            {label}
          </span>
          <output htmlFor={id} className="ctl-slider-field__value">
            {vals.map((v) => format(v)).join(" – ")}
          </output>
        </div>
      ) : null}
      <div
        id={id}
        className="ctl-slider"
        style={style}
        data-tone={tone === "ai" ? "ai" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-bubble={bubble ? "" : undefined}
        data-dragging={dragging >= 0 ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={railRef} className="ctl-slider__rail">
          <div className="ctl-slider__fill" />
        </div>
        {vals.map((v, index) => {
          const thumbId = `${id}-thumb-${index}`;
          return (
            <div
              key={index}
              ref={(node) => {
                thumbRefs.current[index] = node;
              }}
              id={thumbId}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={range ? rangeNames[index] : label ? undefined : ariaLabel}
              aria-labelledby={label ? (range ? `${labelId} ${thumbId}` : labelId) : undefined}
              aria-valuemin={range && index === 1 ? vals[0] : min}
              aria-valuemax={range && index === 0 ? vals[1] : max}
              aria-valuenow={v}
              aria-valuetext={(valueText ?? format)(v)}
              aria-orientation="horizontal"
              aria-disabled={disabled || undefined}
              data-active={dragging === index ? "" : undefined}
              className="ctl-slider__thumb"
              style={{ "--p": percent(v) } as CSSProperties}
              onKeyDown={onKeyDown(index)}
            >
              <span className="ctl-slider__bubble" aria-hidden="true">
                {format(v)}
              </span>
            </div>
          );
        })}
        {name
          ? range
            ? [`${name}_min`, `${name}_max`].map((n, i) => <input key={n} type="hidden" name={n} value={vals[i]} disabled={disabled} />)
            : <input type="hidden" name={name} value={vals[0]} disabled={disabled} />
          : null}
      </div>
      {showScale ? (
        <div className="ctl-slider__scale" aria-hidden="true">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      ) : null}
    </div>
  );
}
