"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  addMonthsKeep,
  clampKey,
  datePresets,
  formatDate,
  formatLong,
  formatMonth,
  formatShort,
  monthGrid,
  outOfRange,
  parseDateInput,
  rangePresets,
  sameMonth,
  startOfMonth,
  todayKey,
  weekdayIndex,
  WEEKDAY_NAMES,
  type DatePreset,
  type RangePreset,
} from "@/lib/dates";
import { Button } from "./button";
import {
  ArrowRightGlyph,
  CalendarGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  focusSoon,
  IconButton,
  TimezoneTag,
  trapTab,
  useControllable,
  useMediaQuery,
  useToday,
} from "./dt-shared";
import { AlertGlyph, fieldClass, fieldHeight } from "./input";
import { Popover } from "./popover";

// ---------------------------------------------------------------------------------------------------------------------
// Calendar — ARIA grid (WAI-ARIA APG «Date Picker Dialog»): roving tabindex, стрілки, PgUp/PgDn, Home/End, Enter/Пропуск.
// Дати — ключі `YYYY-MM-DD`, арифметика в UTC (src/lib/dates.ts).
// ---------------------------------------------------------------------------------------------------------------------

interface CalendarProps {
  mode: "single" | "range";
  months?: 1 | 2;
  today: string;
  min?: string;
  max?: string;
  /** single */
  value?: string;
  onSelect?: (key: string) => void;
  /** range: `end` порожній, поки вибрано лише початок */
  start?: string;
  end?: string;
  onRangeChange?: (start: string, end: string) => void;
  autoFocus?: boolean;
}

type Dir = 1 | -1;

function Calendar({ mode, months = 1, today, min, max, value = "", onSelect, start = "", end = "", onRangeChange, autoFocus }: CalendarProps) {
  const uid = useId();
  const root = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);
  const counter = useRef(0);

  const anchorDate = value || start || today;
  const [view, setView] = useState(() => startOfMonth(anchorDate));
  const [focusDate, setFocusDate] = useState(() => clampKey(anchorDate, min, max));
  const [hover, setHover] = useState("");
  const [enter, setEnter] = useState<Dir | 0>(0);
  const [leave, setLeave] = useState<{ view: string; dir: Dir; id: number } | null>(null);
  const [live, setLive] = useState("");
  const [popped, setPopped] = useState("");

  const picking = mode === "range" && Boolean(start) && !end;
  const lastMonth = months === 2 ? addMonths(view, 1) : view;
  const inView = (key: string) => sameMonth(key, view) || sameMonth(key, lastMonth);

  const go = (nextView: string, dir: Dir) => {
    setLeave({ view, dir, id: ++counter.current });
    setEnter(dir);
    setView(nextView);
    setLive(months === 2 ? `${formatMonth(nextView)} – ${formatMonth(addMonths(nextView, 1))}` : formatMonth(nextView));
  };

  // Старий місяць лишається на час зсуву (його видаляє таймер: анімації може не бути за reduced motion).
  useEffect(() => {
    if (!leave) return;
    const timer = window.setTimeout(() => setLeave(null), 360);
    return () => window.clearTimeout(timer);
  }, [leave]);

  // Місяць із клавіатури: перегортаємо, якщо дата поза видимими місяцями.
  const moveFocus = (key: string) => {
    wantFocus.current = true;
    setFocusDate(key);
    if (inView(key)) return;
    if (key < view) go(startOfMonth(key), -1);
    else go(months === 2 ? addMonths(startOfMonth(key), -1) : startOfMonth(key), 1);
  };

  const nav = (delta: Dir) => {
    const next = addMonths(view, delta);
    const nextLast = months === 2 ? addMonths(next, 1) : next;
    if (!(sameMonth(focusDate, next) || sameMonth(focusDate, nextLast))) setFocusDate(addMonthsKeep(focusDate, delta));
    go(next, delta);
  };

  const choose = (key: string) => {
    if (outOfRange(key, min, max)) return;
    // День сусіднього місяця: moveFocus перегортає вид, щоб вибрана дата була в сітці й мала tabIndex=0.
    moveFocus(key);
    if (mode === "single") {
      setPopped(key);
      setLive(formatLong(key));
      onSelect?.(key);
      return;
    }
    if (!start || end) {
      setHover("");
      setLive(`Start date ${formatShort(key)}. Choose an end date.`);
      onRangeChange?.(key, "");
    } else {
      const [a, b] = key < start ? [key, start] : [start, key];
      setHover("");
      setLive(`${formatShort(a)} to ${formatShort(b)} selected.`);
      onRangeChange?.(a, b);
    }
  };

  const cellFor = (key: string) =>
    root.current?.querySelector<HTMLElement>(`.dt-cal__pane:not([data-leaving]) [data-date="${key}"]:not([data-outside]):not([data-blank])`) ??
    root.current?.querySelector<HTMLElement>(`.dt-cal__pane:not([data-leaving]) [data-date="${key}"]:not([data-blank])`);

  // Фокус на клітинці після зміни місяця чи фокусної дати (стежимо прапорцем: фокус лишається в сітці, не крадеться).
  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    cellFor(focusDate)?.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (autoFocus) focusSoon(() => cellFor(focusDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!popped) return;
    const timer = window.setTimeout(() => setPopped(""), 400);
    return () => window.clearTimeout(timer);
  }, [popped]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-date]");
    if (!cell) return;
    const key = cell.dataset.date!;
    let next: string | null = null;
    switch (event.key) {
      case "ArrowLeft": next = addDays(key, -1); break;
      case "ArrowRight": next = addDays(key, 1); break;
      case "ArrowUp": next = addDays(key, -7); break;
      case "ArrowDown": next = addDays(key, 7); break;
      case "Home": next = addDays(key, -weekdayIndex(key)); break;
      case "End": next = addDays(key, 6 - weekdayIndex(key)); break;
      case "PageUp": next = addMonthsKeep(key, event.shiftKey ? -12 : -1); break;
      case "PageDown": next = addMonthsKeep(key, event.shiftKey ? 12 : 1); break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(key);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (picking) setHover(next);
    moveFocus(next);
  };

  const rangeState = (key: string) => {
    if (mode !== "range" || !start) return null;
    const stop = end || (picking && hover ? hover : "");
    const [a, b] = stop && stop < start ? [stop, start] : [start, stop];
    if (key === a) return { kind: "start" as const, single: !b || a === b };
    if (b && key === b) return { kind: "end" as const, single: false };
    if (b && key > a && key < b) return { kind: end ? ("mid" as const) : ("preview" as const), single: false };
    return null;
  };

  const renderMonth = (monthKey: string, index: number, paneId: string) => {
    const titleId = `${uid}-${paneId}-${index}`;
    return (
      <div key={monthKey} className="dt-cal__month">
        <h3 id={titleId} className="dt-cal__title">
          {formatMonth(monthKey)}
        </h3>
        <div role="grid" aria-labelledby={titleId}>
          <div role="row" className="dt-cal__row">
            {WEEKDAY_NAMES.map((name) => (
              <div key={name} role="columnheader" className="dt-cal__dow" aria-label={name} title={name}>
                {name.slice(0, 2)}
              </div>
            ))}
          </div>
          {monthGrid(monthKey).map((row) => (
            <div key={row[0]} role="row" className="dt-cal__row">
              {row.map((key, col) => {
                const outside = !sameMonth(key, monthKey);
                if (outside && months === 2) return <div key={key} role="gridcell" aria-hidden="true" data-blank="" data-date={key} className="dt-day" />;
                const disabled = outOfRange(key, min, max);
                const selected = mode === "single" ? key === value : key === start || key === end;
                const range = rangeState(key);
                const isToday = key === today;
                const rover = key === focusDate && !outside;
                return (
                  <div
                    key={key}
                    role="gridcell"
                    tabIndex={rover ? 0 : -1}
                    data-date={key}
                    data-col={col}
                    aria-label={`${formatLong(key)}${isToday ? ", today" : ""}`}
                    aria-selected={selected}
                    aria-disabled={disabled || undefined}
                    aria-current={isToday ? "date" : undefined}
                    data-outside={outside || undefined}
                    data-today={isToday || undefined}
                    data-range={range?.kind}
                    data-range-single={range?.single || undefined}
                    data-hover={(picking && hover === key) || undefined}
                    data-pop={popped === key || undefined}
                    className="dt-day"
                    onClick={() => choose(key)}
                  >
                    <span className="dt-day__n">{Number(key.slice(8))}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPane = (first: string, paneId: string) => Array.from({ length: months }, (_, i) => renderMonth(addMonths(first, i), i, paneId));

  const prevDisabled = Boolean(min) && addDays(view, -1) < min!;
  const nextDisabled = Boolean(max) && addMonths(view, months) > max!;

  return (
    <div
      ref={root}
      className="dt-cal"
      onKeyDown={onKeyDown}
      onPointerLeave={() => picking && setHover("")}
      onPointerMove={(event) => {
        if (!picking) return;
        const key = (event.target as HTMLElement).closest<HTMLElement>("[data-date]:not([data-blank])")?.dataset.date;
        if (key && key !== hover) setHover(key);
      }}
    >
      <IconButton className="dt-cal__nav" data-dir="prev" aria-label="Previous month" disabled={prevDisabled} onClick={() => nav(-1)}>
        <ChevronLeftGlyph />
      </IconButton>
      <IconButton className="dt-cal__nav" data-dir="next" aria-label="Next month" disabled={nextDisabled} onClick={() => nav(1)}>
        <ChevronRightGlyph />
      </IconButton>
      <div className="dt-cal__viewport">
        <div key={`pane-${view}`} className="dt-cal__pane" data-enter={enter ? "" : undefined} style={{ "--dir": enter } as CSSProperties}>
          {renderPane(view, "m")}
        </div>
        {leave ? (
          <div key={`leave-${leave.id}`} className="dt-cal__pane" data-leaving="" aria-hidden="true" inert style={{ "--dir": leave.dir } as CSSProperties}>
            {renderPane(leave.view, "l")}
          </div>
        ) : null}
      </div>
      <div className="dt-cal__live" aria-live="polite">
        {live}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Спільна логіка полів
// ---------------------------------------------------------------------------------------------------------------------

/** Текст поля, що слідкує за значенням: зовнішня зміна значення переписує текст, а хибний ввід (значення скинуто) — ні. */
function useSyncedText(valueKey: string, format: (key: string) => string) {
  const [text, setText] = useState(() => format(valueKey));
  const [seen, setSeen] = useState(valueKey);
  if (valueKey !== seen) {
    setSeen(valueKey);
    setText(format(valueKey));
  }
  return { text, setText, markSeen: setSeen };
}

export type DateProblem = "format" | "range" | "order";

interface FieldAria {
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  size?: "md" | "lg";
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  /** Позначка «Kyiv time» у рядку підпису Field (праворуч) і в підвалі календаря. Поза Field — лише в підвалі. */
  showTimezone?: boolean;
  /** Дата «сьогодні» (YYYY-MM-DD). За замовчуванням — сьогодні в Києві. */
  today?: string;
  min?: string;
  max?: string;
}

const isInvalid = (v: FieldAria["aria-invalid"]) => v === true || v === "true";

function usePopoverState() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };
  return { open, setOpen, close, button, anchor };
}

/** Esc закриває й повертає фокус на кнопку, Tab крутиться всередині поповера. */
function popoverKeys(close: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    trapTab(event);
  };
}

function PresetPill({ label, sub, pressed, disabled, onClick }: { label: string; sub?: string; pressed: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="dt-preset" aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {label}
      {sub ? <span className="dt-preset__n">{sub}</span> : null}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------------------------------------------------

export interface DatePickerProps extends FieldAria {
  name?: string;
  /** ISO `YYYY-MM-DD`; порожній рядок — дати немає. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Хибний ввід (`format` — не розпізнано, `range` — поза min/max) або `null`, коли ввід знову коректний. */
  onInvalidInput?: (problem: DateProblem | null) => void;
  placeholder?: string;
  /** `true` — Today / Tomorrow / Next week; або власний список. */
  presets?: boolean | DatePreset[];
}

/**
 * Поле дати: пише текстом («24 Oct», «tomorrow», ISO) або вибирає в календарі. У форму йде ISO `YYYY-MM-DD` через
 * прихований input. Помилку показує обгортка `Field` (`aria-invalid` лише фарбує поле й додає значок).
 */
export function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  onInvalidInput,
  placeholder = "e.g. 24 Oct 2026",
  presets,
  min,
  max,
  today: todayProp,
  showTimezone,
  size = "md",
  disabled,
  readOnly,
  required,
  className,
  ...aria
}: DatePickerProps) {
  const reactId = useId();
  const popId = `${reactId}-cal`;
  const today = useToday(todayProp);
  const [current, setValue] = useControllable<string>(value, defaultValue, onValueChange);
  const { text, setText, markSeen } = useSyncedText(current, (k) => (k ? formatDate(k) : ""));
  const [problem, setProblem] = useState<DateProblem | null>(null);
  const { open, setOpen, close, button, anchor } = usePopoverState();
  const invalid = isInvalid(aria["aria-invalid"]) || problem !== null;

  const flag = (next: DateProblem | null) => {
    setProblem(next);
    onInvalidInput?.(next);
  };

  const commitValue = (key: string) => {
    flag(null);
    markSeen(key);
    setText(key ? formatDate(key) : "");
    setValue(key);
  };

  const commitText = () => {
    const parsed = parseDateInput(text, today ?? todayKey());
    if (parsed === null) {
      flag("format");
      markSeen("");
      setValue("");
    } else if (parsed && outOfRange(parsed, min, max)) {
      flag("range");
      markSeen("");
      setValue("");
    } else if (parsed !== current || problem) {
      commitValue(parsed);
    } else {
      setText(parsed ? formatDate(parsed) : "");
    }
  };

  const openCalendar = () => {
    if (disabled || readOnly) return;
    setOpen(true);
  };

  const pick = (key: string) => {
    commitValue(key);
    window.setTimeout(() => close(), 140);
  };

  const presetList = presets === true ? (today ? datePresets(today) : datePresets("2000-01-01").map((p) => ({ ...p, value: "" }))) : presets || [];

  return (
    <div className={cn("relative", className)}>
      {showTimezone ? <TimezoneTag className="dt-tz-corner" /> : null}
      <div ref={anchor} className="relative">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-label={aria["aria-label"]}
          aria-labelledby={aria["aria-labelledby"]}
          aria-describedby={aria["aria-describedby"]}
          onChange={(event) => {
            setText(event.target.value);
            if (problem) {
              const parsed = parseDateInput(event.target.value, today ?? todayKey());
              if (parsed !== null && !(parsed && outOfRange(parsed, min, max))) flag(null);
            }
          }}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitText();
            } else if (event.key === "ArrowDown" && (event.altKey || !text)) {
              event.preventDefault();
              openCalendar();
            }
          }}
          className={cn(fieldClass, fieldHeight[size], "tabular", invalid ? "pr-16" : "pr-10")}
        />
        <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {invalid ? <AlertGlyph /> : null}
          <IconButton
            ref={button}
            aria-label="Choose date"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? popId : undefined}
            disabled={disabled || readOnly}
            onClick={() => (open ? close(false) : openCalendar())}
          >
            <CalendarGlyph />
          </IconButton>
        </span>
        <Popover open={open} onDismiss={() => close(false)} anchorRef={anchor} matchWidth={false} id={popId} role="dialog" aria-label="Choose date">
          <div className="dt-pop" onKeyDown={popoverKeys(close)}>
            <Calendar mode="single" today={today ?? todayKey()} min={min} max={max} value={current} onSelect={pick} autoFocus />
            <div className="dt-pop__foot">
              {showTimezone ? <TimezoneTag date={current || today || undefined} /> : <span />}
              <Button
                variant="ghost"
                size="sm"
                disabled={outOfRange(today ?? todayKey(), min, max)}
                onClick={() => {
                  commitValue(today ?? todayKey());
                  close();
                }}
              >
                Today
              </Button>
            </div>
          </div>
        </Popover>
      </div>
      {presets ? (
        <div className="dt-presets" role="group" aria-label="Quick dates">
          {presetList.map((preset) => (
            <PresetPill
              key={preset.label}
              label={preset.label}
              sub={preset.value ? formatShort(preset.value) : undefined}
              pressed={Boolean(preset.value) && current === preset.value}
              disabled={disabled || readOnly || (Boolean(preset.value) && outOfRange(preset.value, min, max))}
              onClick={() => preset.value && commitValue(preset.value)}
            />
          ))}
        </div>
      ) : null}
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// DateRangePicker
// ---------------------------------------------------------------------------------------------------------------------

export interface DateRange {
  start: string;
  end: string;
}

export interface DateRangePickerProps extends FieldAria {
  startName?: string;
  endName?: string;
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
  onInvalidInput?: (problem: DateProblem | null) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  /** `true` — This week, Next 7 days, Next week, This month; або власний список. */
  presets?: boolean | RangePreset[];
}

const EMPTY_RANGE: DateRange = { start: "", end: "" };

/** Діапазон дат: два поля тексту й календар на два місяці (на вузьких екранах — один) із підсвіткою ходу вибору. */
export function DateRangePicker({
  id,
  startName,
  endName,
  value,
  defaultValue = EMPTY_RANGE,
  onValueChange,
  onInvalidInput,
  startPlaceholder = "Start date",
  endPlaceholder = "End date",
  presets,
  min,
  max,
  today: todayProp,
  showTimezone,
  size = "md",
  disabled,
  readOnly,
  required,
  className,
  ...aria
}: DateRangePickerProps) {
  const reactId = useId();
  const popId = `${reactId}-cal`;
  const today = useToday(todayProp);
  const narrow = useMediaQuery("(max-width: 639px)");
  const [range, setRange] = useControllable<DateRange>(value, defaultValue, onValueChange);
  const startText = useSyncedText(range.start, (k) => (k ? formatDate(k) : ""));
  const endText = useSyncedText(range.end, (k) => (k ? formatDate(k) : ""));
  const [problem, setProblem] = useState<DateProblem | null>(null);
  const { open, setOpen, close, button, anchor } = usePopoverState();
  const invalid = isInvalid(aria["aria-invalid"]) || problem !== null;

  const flag = (next: DateProblem | null) => {
    setProblem(next);
    onInvalidInput?.(next);
  };

  const apply = (next: DateRange) => {
    flag(next.start && next.end && next.end < next.start ? "order" : null);
    startText.markSeen(next.start);
    endText.markSeen(next.end);
    startText.setText(next.start ? formatDate(next.start) : "");
    endText.setText(next.end ? formatDate(next.end) : "");
    setRange(next);
  };

  const commit = (which: "start" | "end") => {
    const field = which === "start" ? startText : endText;
    const parsed = parseDateInput(field.text, today ?? todayKey());
    // Хибний ввід скидає цей кінець діапазону, як DatePicker.commitText: у прихованих полях не лишається старе значення.
    if (parsed === null) {
      flag("format");
      field.markSeen("");
      setRange({ ...range, [which]: "" });
      return;
    }
    if (parsed && outOfRange(parsed, min, max)) {
      flag("range");
      field.markSeen("");
      setRange({ ...range, [which]: "" });
      return;
    }
    if (parsed === range[which] && !problem) {
      field.setText(parsed ? formatDate(parsed) : "");
      return;
    }
    apply({ ...range, [which]: parsed });
  };

  const finish = (next: DateRange) => {
    apply(next);
    window.setTimeout(() => close(), 160);
  };

  const presetList = presets === true ? (today ? rangePresets(today) : []) : presets || [];
  const todayNow = today ?? todayKey();
  const fieldKeys = (which: "start" | "end") => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit(which);
    else if (event.key === "ArrowDown" && event.altKey) {
      event.preventDefault();
      if (!disabled && !readOnly) setOpen(true);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {showTimezone ? <TimezoneTag className="dt-tz-corner" /> : null}
      <div
        ref={anchor}
        role="group"
        aria-label={aria["aria-label"] ?? (aria["aria-labelledby"] ? undefined : "Date range")}
        aria-labelledby={aria["aria-labelledby"]}
        className={cn("dt-shell dt-range tabular", fieldHeight[size])}
        data-invalid={invalid || undefined}
        data-open={open || undefined}
        data-disabled={disabled || undefined}
      >
        <input
          id={id}
          className="dt-input"
          type="text"
          autoComplete="off"
          aria-label="Start date"
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={aria["aria-describedby"]}
          placeholder={startPlaceholder}
          disabled={disabled}
          readOnly={readOnly}
          value={startText.text}
          onChange={(event) => startText.setText(event.target.value)}
          onBlur={() => commit("start")}
          onKeyDown={fieldKeys("start")}
        />
        <span className="dt-range__arrow" aria-hidden="true">
          <ArrowRightGlyph />
        </span>
        <input
          id={id ? `${id}-end` : undefined}
          className="dt-input"
          type="text"
          autoComplete="off"
          aria-label="End date"
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={aria["aria-describedby"]}
          placeholder={endPlaceholder}
          disabled={disabled}
          readOnly={readOnly}
          value={endText.text}
          onChange={(event) => endText.setText(event.target.value)}
          onBlur={() => commit("end")}
          onKeyDown={fieldKeys("end")}
        />
        {invalid ? <AlertGlyph /> : null}
        <IconButton
          ref={button}
          className="-mr-1.5"
          aria-label="Choose dates"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          disabled={disabled || readOnly}
          onClick={() => (open ? close(false) : setOpen(true))}
        >
          <CalendarGlyph />
        </IconButton>
        <Popover open={open} onDismiss={() => close(false)} anchorRef={anchor} matchWidth={false} id={popId} role="dialog" aria-label="Choose dates">
          <div className="dt-pop" onKeyDown={popoverKeys(close)}>
            <Calendar
              mode="range"
              months={narrow ? 1 : 2}
              today={todayNow}
              min={min}
              max={max}
              start={range.start}
              end={range.end}
              onRangeChange={(start, end) => (end ? finish({ start, end }) : apply({ start, end }))}
              autoFocus
            />
            {presetList.length ? (
              <div className="dt-pop__presets" role="group" aria-label="Quick ranges">
                {presetList.map((preset) => (
                  <PresetPill
                    key={preset.label}
                    label={preset.label}
                    pressed={range.start === preset.start && range.end === preset.end}
                    disabled={outOfRange(preset.start, min, max) || outOfRange(preset.end, min, max)}
                    onClick={() => finish({ start: preset.start, end: preset.end })}
                  />
                ))}
              </div>
            ) : null}
            <div className="dt-pop__foot">
              {showTimezone ? <TimezoneTag date={range.start || today || undefined} /> : <span />}
              <Button variant="ghost" size="sm" disabled={!range.start && !range.end} onClick={() => apply(EMPTY_RANGE)}>
                Clear
              </Button>
            </div>
          </div>
        </Popover>
      </div>
      {startName ? <input type="hidden" name={startName} value={range.start} /> : null}
      {endName ? <input type="hidden" name={endName} value={range.end} /> : null}
    </div>
  );
}
