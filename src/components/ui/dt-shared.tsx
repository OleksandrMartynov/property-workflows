"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { kyivZoneName, todayKey } from "@/lib/dates";
import "./date-time.css";

// Спільні деталі дат, часу й чисел: керований/некерований стан, «сьогодні» за Києвом, іконки, кнопка в полі.

/** Керований (`value`) або некерований (`defaultValue`) стан із колбеком. */
export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const ref = useRef(current);
  useEffect(() => {
    ref.current = current;
  });
  const set = useCallback(
    (next: T) => {
      ref.current = next;
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set, ref] as const;
}

const noopSubscribe = () => () => {};

/** Сьогодні (Europe/Kyiv). На сервері й під час гідрації — `null`, щоб розмітка збігалася; `override` задає дату явно. */
export function useToday(override?: string): string | null {
  const live = useSyncExternalStore(noopSubscribe, () => todayKey(), () => null);
  return override ?? live;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Іконки (16×16, штрих 1.5) ---

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("size-4 shrink-0", className)}>
      {children}
    </svg>
  );
}
export const CalendarGlyph = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
    <path d="M2.5 6.75h11M5.5 2v2.5M10.5 2v2.5" />
  </Svg>
);
export const ChevronLeftGlyph = () => (
  <Svg>
    <path d="m9.5 4-4 4 4 4" />
  </Svg>
);
export const ChevronRightGlyph = () => (
  <Svg>
    <path d="m6.5 4 4 4-4 4" />
  </Svg>
);
export const ChevronDownGlyph = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m4 6.2 4 4 4-4" />
  </Svg>
);
export const ArrowRightGlyph = () => (
  <Svg>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);
export const ClockGlyph = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3.2l2 1.2" />
  </Svg>
);
export const PlusGlyph = () => (
  <Svg>
    <path d="M8 3.5v9M3.5 8h9" />
  </Svg>
);
export const MinusGlyph = () => (
  <Svg>
    <path d="M3.5 8h9" />
  </Svg>
);

/** Квадратна кнопка 24 px у полі (календар, годинник, крок). Вигляд — `.dt-iconbtn` у date-time.css. */
export function IconButton({ className, type = "button", ...props }: ComponentProps<"button">) {
  return <button type={type} className={cn("dt-iconbtn", className)} {...props} />;
}

/** «Kyiv time GMT+3»: усі дати й час у продукті — за Києвом. */
export function TimezoneTag({ date, className }: { date?: string; className?: string }) {
  const today = useToday();
  const zone = date ?? today;
  return (
    <span className={cn("dt-tz", className)} title="Europe/Kyiv">
      <ClockGlyph className="size-3" />
      <span>Kyiv time</span>
      {zone ? <span className="tabular">{kyivZoneName(zone)}</span> : null}
    </span>
  );
}

/** Tab у поповері крутиться між його елементами, що фокусуються (діалог за APG). */
export function trapTab(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const nodes = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  ).filter((el) => !el.closest("[inert]"));
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Фокус після монтування поповера: він ще може бути `visibility: hidden` у першому кадрі, тому через rAF. */
export function focusSoon(get: () => HTMLElement | null | undefined) {
  requestAnimationFrame(() => {
    const el = get();
    if (!el) return;
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) setTimeout(() => get()?.focus({ preventScroll: true }), 30);
  });
}
