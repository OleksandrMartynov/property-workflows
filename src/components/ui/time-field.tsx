"use client";

import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ChevronDownGlyph, ClockGlyph, focusSoon, IconButton, TimezoneTag, trapTab, useControllable } from "./dt-shared";
import { AlertGlyph, fieldHeight } from "./input";
import { Popover } from "./popover";

const pad2 = (n: number) => String(n).padStart(2, "0");

interface Parts {
  h: number | null;
  m: number | null;
}

const toParts = (value: string): Parts => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return { h: null, m: null };
  return { h: Number(match[1]), m: Number(match[2]) };
};
const toValue = ({ h, m }: Parts) => (h !== null && m !== null ? `${pad2(h)}:${pad2(m)}` : "");

interface SegmentProps {
  which: "h" | "m";
  parts: Parts;
  update: (next: Parts) => void;
  jump: (to: "h" | "m") => void;
  inputRef: RefObject<HTMLInputElement | null>;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  invalid: boolean;
  describedBy?: string;
  onOpen?: () => void;
}

/** Один сегмент часу: spinbutton на текстовому полі (не type=number: без рідних стрілок і з власною клавіатурою). */
function Segment({ which, parts, update, jump, inputRef, id, disabled, required, invalid, describedBy, onOpen }: SegmentProps) {
  const buffer = useRef("");
  const max = which === "h" ? 23 : 59;
  const val = parts[which];
  const put = (v: number | null) => update({ ...parts, [which]: v === null ? null : ((v % (max + 1)) + max + 1) % (max + 1) });
  const typeDigit = (digit: string) => {
    buffer.current += digit;
    const v = Number(buffer.current);
    const done = buffer.current.length === 2 || v * 10 > max;
    update({ ...parts, [which]: Math.min(v, max) });
    if (done) {
      buffer.current = "";
      if (which === "h") jump("m");
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey && event.key === "ArrowDown" && onOpen) {
      event.preventDefault();
      onOpen();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      typeDigit(event.key);
      return;
    }
    switch (event.key) {
      case "ArrowUp": event.preventDefault(); put((val ?? -1) + 1); break;
      case "ArrowDown": event.preventDefault(); put((val ?? 1) - 1); break;
      case "PageUp": event.preventDefault(); put((val ?? 0) + 10); break;
      case "PageDown": event.preventDefault(); put((val ?? 0) - 10); break;
      case "Home": event.preventDefault(); put(0); break;
      case "End": event.preventDefault(); put(max); break;
      case "ArrowRight": if (which === "h") { event.preventDefault(); jump("m"); } break;
      case "ArrowLeft": if (which === "m") { event.preventDefault(); jump("h"); } break;
      case ":":
      case ".":
        event.preventDefault();
        if (which === "h") jump("m");
        break;
      case "Backspace":
      case "Delete":
        event.preventDefault();
        buffer.current = "";
        put(null);
        break;
      case "Tab":
      case "Enter":
      case "Escape":
        break;
      default:
        if (event.key.length === 1) event.preventDefault();
    }
  };
  return (
    <input
      ref={inputRef}
      id={id}
      className="dt-input dt-seg"
      role="spinbutton"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="––"
      disabled={disabled}
      value={val === null ? "" : pad2(val)}
      aria-label={which === "h" ? "Hours" : "Minutes"}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={val ?? undefined}
      aria-valuetext={val === null ? "Empty" : `${pad2(val)} ${which === "h" ? "hours" : "minutes"}`}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      // Мобільні клавіатури не дають key: беремо цифру зі зміненого тексту.
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const digit = event.target.value.replace(/\D/g, "").slice(-1);
        if (digit) typeDigit(digit);
      }}
      onFocus={(event) => {
        buffer.current = "";
        const input = event.currentTarget;
        window.setTimeout(() => input.select(), 0);
      }}
      onBlur={() => {
        buffer.current = "";
      }}
      onPointerUp={(event) => event.currentTarget.select()}
    />
  );
}

export interface TimeFieldProps {
  id?: string;
  name?: string;
  /** `HH:MM` (24 години); порожній рядок — часу немає. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Поповер зі стовпцями годин і хвилин. За замовчуванням є. */
  popover?: boolean;
  /** Крок у стовпці хвилин (вводити можна будь-яку хвилину). */
  minuteStep?: number;
  /** Позначка «Kyiv time» у рядку підпису Field (праворуч) і в підвалі поповера. */
  showTimezone?: boolean;
  size?: "md" | "lg";
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

/**
 * Час HH:MM: сегменти з клавіатури (цифри, ↑ ↓ крок із переходом через межу, PgUp/PgDn ±10, Home/End, Backspace
 * очищає, ← → і «:» між сегментами) і необов'язковий поповер зі стовпцями. У форму йде `HH:MM` або порожньо.
 * Час — Київ; зсув пояса показує лише позначка, а не поле.
 */
export function TimeField({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  popover = true,
  minuteStep = 5,
  showTimezone,
  size = "md",
  disabled,
  required,
  className,
  ...aria
}: TimeFieldProps) {
  const reactId = useId();
  const popId = `${reactId}-time`;
  const [current, setCurrent] = useControllable<string>(value, defaultValue, onValueChange);
  const [parts, setParts] = useState<Parts>(() => toParts(current));
  const [seen, setSeen] = useState(current);
  // Зовнішня зміна значення переписує сегменти; власні правки (зокрема неповний час) — ні.
  if (current !== seen) {
    setSeen(current);
    setParts(toParts(current));
  }
  const [open, setOpen] = useState(false);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const invalid = aria["aria-invalid"] === true || aria["aria-invalid"] === "true";

  const update = (next: Parts) => {
    const str = toValue(next);
    setParts(next);
    setSeen(str);
    if (str !== current) setCurrent(str);
  };

  const jump = (to: "h" | "m") => (to === "h" ? hourRef : minuteRef).current?.focus();

  const closePopover = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
  if (parts.m !== null && !minutes.includes(parts.m)) minutes.push(parts.m);
  minutes.sort((a, b) => a - b);

  const openPopover = () => {
    if (disabled) return;
    setOpen(true);
    focusSoon(() => {
      const root = pop.current;
      if (!root) return null;
      root.querySelectorAll<HTMLElement>(".dt-timecol").forEach((col) => {
        const sel = col.querySelector<HTMLElement>('[aria-selected="true"]');
        if (sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.offsetHeight / 2;
      });
      return root.querySelector<HTMLElement>('[data-col="h"] [tabindex="0"]');
    });
  };

  const onOptionKeys = (event: KeyboardEvent<HTMLElement>) => {
    const option = (event.target as HTMLElement).closest<HTMLElement>(".dt-timeopt");
    if (!option) return;
    const column = option.parentElement as HTMLElement;
    const items = Array.from(column.querySelectorAll<HTMLElement>(".dt-timeopt"));
    const index = items.indexOf(option);
    const isHour = column.dataset.col === "h";
    const target = pop.current;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowDown": next = Math.min(items.length - 1, index + 1); break;
      case "ArrowUp": next = Math.max(0, index - 1); break;
      case "Home": next = 0; break;
      case "End": next = items.length - 1; break;
      case "PageDown": next = Math.min(items.length - 1, index + 6); break;
      case "PageUp": next = Math.max(0, index - 6); break;
      case "ArrowRight":
        if (isHour) {
          event.preventDefault();
          (target?.querySelector<HTMLElement>('[data-col="m"] [tabindex="0"]') ?? target?.querySelector<HTMLElement>('[data-col="m"] .dt-timeopt'))?.focus();
        }
        return;
      case "ArrowLeft":
        if (!isHour) {
          event.preventDefault();
          target?.querySelector<HTMLElement>('[data-col="h"] [tabindex="0"]')?.focus();
        }
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        closePopover();
        return;
      default:
        return;
    }
    event.preventDefault();
    const item = items[next];
    const v = Number(item.dataset.v);
    update(isHour ? { h: v, m: parts.m ?? 0 } : { ...parts, m: v });
    requestAnimationFrame(() => item.focus());
  };

  const optionProps = (col: "h" | "m", v: number, selected: boolean, first: boolean) => ({
    role: "option" as const,
    "aria-selected": selected,
    "data-v": v,
    tabIndex: selected || (first && (col === "h" ? parts.h : parts.m) === null) ? 0 : -1,
    className: "dt-timeopt",
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      const el = event.currentTarget;
      if (col === "h") {
        update({ h: v, m: parts.m ?? 0 });
        el.focus({ preventScroll: true });
        pop.current?.querySelector<HTMLElement>('[data-col="m"] [aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
      } else {
        update({ ...parts, m: v });
        el.focus({ preventScroll: true });
        window.setTimeout(() => closePopover(), 120);
      }
    },
  });

  return (
    <div className={cn("relative", className)}>
      {showTimezone ? <TimezoneTag className="dt-tz-corner" /> : null}
      <div
        ref={anchor}
        role="group"
        aria-label={aria["aria-label"] ?? (aria["aria-labelledby"] ? undefined : "Time (24-hour)")}
        aria-labelledby={aria["aria-labelledby"]}
        className={cn("dt-shell dt-time", fieldHeight[size])}
        data-invalid={invalid || undefined}
        data-open={open || undefined}
        data-disabled={disabled || undefined}
      >
        <span className="dt-time__lead" aria-hidden="true">
          <ClockGlyph />
        </span>
        <Segment which="h" id={id} parts={parts} update={update} jump={jump} inputRef={hourRef} disabled={disabled} required={required} invalid={invalid} describedBy={aria["aria-describedby"]} onOpen={popover ? openPopover : undefined} />
        <span className="dt-time__colon" aria-hidden="true">
          :
        </span>
        <Segment which="m" parts={parts} update={update} jump={jump} inputRef={minuteRef} disabled={disabled} required={required} invalid={invalid} describedBy={aria["aria-describedby"]} onOpen={popover ? openPopover : undefined} />
        <span className="dt-time__spacer" />
        {invalid ? <AlertGlyph /> : null}
        {popover ? (
          <IconButton
            ref={button}
            className="-mr-1.5"
            aria-label="Choose time"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? popId : undefined}
            disabled={disabled}
            onClick={() => (open ? closePopover(false) : openPopover())}
          >
            <ChevronDownGlyph className={cn("transition-transform duration-(--duration-fast) ease-standard", open && "rotate-180")} />
          </IconButton>
        ) : null}
        {popover ? (
          <Popover open={open} onDismiss={() => closePopover(false)} anchorRef={anchor} matchWidth={false} id={popId} role="dialog" aria-label="Choose time">
            <div
              ref={pop}
              className="dt-pop"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  closePopover();
                  return;
                }
                trapTab(event);
                onOptionKeys(event);
              }}
            >
              <div className="dt-timepop">
                <div className="dt-timecol" role="listbox" aria-label="Hours" data-col="h">
                  <div className="dt-timecol__head" aria-hidden="true">
                    Hour
                  </div>
                  {hours.map((v) => (
                    <div key={v} {...optionProps("h", v, parts.h === v, v === 0)}>
                      {pad2(v)}
                    </div>
                  ))}
                </div>
                <div className="dt-timecol" role="listbox" aria-label="Minutes" data-col="m">
                  <div className="dt-timecol__head" aria-hidden="true">
                    Min
                  </div>
                  {minutes.map((v) => (
                    <div key={v} {...optionProps("m", v, parts.m === v, v === 0)}>
                      {pad2(v)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="dt-pop__foot">
                {showTimezone ? <TimezoneTag /> : <span />}
                <Button variant="ghost" size="sm" onClick={() => closePopover()}>
                  Done
                </Button>
              </div>
            </div>
          </Popover>
        ) : null}
      </div>
      {/* Вимкнене поле не надсилає значення у FormData, як Segmented і Slider; обов'язковість — aria-required на сегментах. */}
      {name ? <input type="hidden" name={name} value={current} disabled={disabled} /> : null}
    </div>
  );
}
