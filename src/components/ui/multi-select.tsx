"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { AlertGlyph } from "./input";
import {
  ChevronGlyph,
  CloseGlyph,
  filterItems,
  firstEnabled,
  keepFocus,
  ListboxSurface,
  Spinner,
  stepEnabled,
  toItem,
  useFieldAria,
  type PickerOption,
} from "./listbox-parts";
import { Popover } from "./popover";

export type MultiSelectOption = PickerOption;

interface MultiSelectProps {
  options: MultiSelectOption[];
  /** Кожне вибране значення йде у форму окремим прихованим input з цим іменем. */
  name?: string;
  id?: string;
  defaultValue?: string[];
  /** Керований режим: значення задає батько; зміни лише викликають onValueChange. */
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Одна лінія: фішки, що не вмістились, згортаються в «+N». */
  compact?: boolean;
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  /** `false` — не фільтрувати на клієнті (варіанти вже відфільтровані зовні). */
  filter?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rootToken = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** Тривалість токена в мс: значення може бути записане як `200ms` або `.2s`. */
const tokenMs = (name: string, fallback: number) => {
  const raw = rootToken(name);
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return fallback;
  return raw.endsWith("ms") ? num : raw.endsWith("s") ? num * 1000 : num;
};

/**
 * Мультивибір (ARIA 1.2 combobox з `aria-multiselectable` списком): вибрані значення — фішки в полі, у самому полі
 * фільтр. Фішки видаляються мишею, кнопкою ✕ або Backspace (коли фільтр порожній); решта фішок переїжджає на нове
 * місце пружиною (FLIP). Список залишається відкритим, рядки — з чекбоксами. `compact` тримає поле в одну лінію.
 */
export function MultiSelect({
  options,
  name,
  id: idProp,
  defaultValue = [],
  value,
  onValueChange,
  placeholder = "Select…",
  disabled,
  compact = false,
  loading = false,
  onQueryChange,
  filter = true,
  emptyTitle = "No matches",
  emptyHint,
  className,
  ...ariaProps
}: MultiSelectProps) {
  const { id, aria, invalid } = useFieldAria(idProp, ariaProps);
  const items = options.map(toItem);
  const reactId = useId();
  const listId = `${reactId}-list`;
  const shell = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const rects = useRef(new Map<string, { x: number; y: number }>());
  const latest = useRef<string[]>([]);
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const [open, setOpen] = useState(false);
  const [popWidth, setPopWidth] = useState(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [overflow, setOverflow] = useState<{ count: number; names: string[] }>({ count: 0, names: [] });
  const [announcement, setAnnouncement] = useState("");

  const visible = filter ? filterItems(items, query) : items;
  const optionId = (i: number) => `${reactId}-o${i}`;
  const byValue = (v: string) => items.find((o) => o.value === v);
  const chips = selected.map((v) => ({ value: v, item: byValue(v) })).filter((c): c is { value: string; item: NonNullable<typeof c.item> } => Boolean(c.item));
  const avatarOf = (v: string) => options.find((o) => o.value === v)?.avatar;

  useLayoutEffect(() => {
    latest.current = selected;
  });

  const commit = (next: string[]) => {
    setInternal(next);
    onValueChange?.(next);
  };
  const announce = (text: string) => setAnnouncement(text);

  const removeValue = (v: string) => {
    const label = byValue(v)?.text ?? v;
    announce(`${label} removed`);
    const apply = () => {
      setLeaving((l) => l.filter((x) => x !== v));
      commit(latest.current.filter((x) => x !== v));
    };
    if (reducedMotion()) return apply();
    // Фішка спершу зникає (≈ 140 мс), потім значення знімається, а решта переїжджає (FLIP).
    setLeaving((l) => (l.includes(v) ? l : [...l, v]));
    window.setTimeout(apply, Math.round(tokenMs("--duration-base", 200) * 0.7));
  };
  const addValue = (v: string) => {
    const label = byValue(v)?.text ?? v;
    announce(`${label} selected`);
    setFresh(v);
    commit([...latest.current, v]);
  };

  const show = () => {
    setPopWidth(Math.max(shell.current?.offsetWidth ?? 0, 180));
    setOpen(true);
  };
  const openList = () => {
    if (disabled || open) return;
    setAnnouncement("");
    setActive(firstEnabled(visible));
    show();
  };
  const closeList = () => setOpen(false);
  const changeQuery = (next: string) => {
    setAnnouncement("");
    setQuery(next);
    setActive(firstEnabled(filter ? filterItems(items, next) : items));
    show();
    onQueryChange?.(next);
  };
  const toggle = (index: number) => {
    const option = visible[index];
    if (!option || option.disabled) return;
    if (latest.current.includes(option.value)) removeValue(option.value);
    else addValue(option.value);
    if (query) {
      setQuery("");
      onQueryChange?.("");
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else setActive((a) => stepEnabled(visible, a, key === "ArrowDown" ? 1 : -1));
    } else if ((key === "Home" || key === "End") && open && !query) {
      event.preventDefault();
      setActive(key === "Home" ? stepEnabled(visible, -1, 1) : stepEnabled(visible, visible.length, -1));
    } else if (key === "Enter") {
      if (open && visible[active]) {
        event.preventDefault();
        toggle(active);
      }
    } else if (key === "Escape") {
      if (open || query) {
        event.preventDefault();
        closeList();
        if (query) {
          setQuery("");
          onQueryChange?.("");
        }
      }
    } else if (key === "Backspace" && !query) {
      const last = [...latest.current].reverse().find((v) => !leaving.includes(v) && byValue(v));
      if (last) {
        event.preventDefault();
        removeValue(last);
      }
    } else if (key === "Tab") {
      closeList();
    }
  };

  // Компактний режим: скільки фішок вміщається в одну лінію; решта ховається, замість них «+N».
  useLayoutEffect(() => {
    const el = shell.current;
    if (!el) return;
    const measure = () => {
      const nodes = [...el.querySelectorAll<HTMLElement>("[data-chip]")];
      nodes.forEach((n) => (n.hidden = false));
      if (!compact || nodes.length < 2) {
        setOverflow((o) => (o.count === 0 ? o : { count: 0, names: [] }));
        return;
      }
      const style = getComputedStyle(el);
      const gap = parseFloat(style.columnGap) || 4;
      const chev = el.querySelector<HTMLElement>(".sf-chev")?.offsetWidth ?? 16;
      const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - chev - 40 - gap * 2;
      const widths = nodes.map((n) => n.offsetWidth + gap);
      let fit = nodes.length;
      if (widths.reduce((a, b) => a + b, 0) > room) {
        fit = 0;
        let sum = 0;
        while (fit < nodes.length && sum + widths[fit] + 36 <= room) sum += widths[fit++];
        fit = Math.max(1, fit);
      }
      nodes.forEach((n, i) => (n.hidden = i >= fit));
      const names = nodes.slice(fit).map((n) => n.dataset.label ?? "");
      setOverflow((o) => (o.count === names.length && o.names.join() === names.join() ? o : { count: names.length, names }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, selected, leaving, options]);

  // FLIP: фішки, що не зникли, переїжджають зі старого місця на нове на пружині (координати відносно поля).
  useLayoutEffect(() => {
    const el = shell.current;
    if (!el) return;
    const origin = el.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number }>();
    const reduce = reducedMotion();
    const duration = tokenMs("--spring-smooth-duration", 360);
    const easing = rootToken("--spring-smooth") || "ease-out";
    el.querySelectorAll<HTMLElement>("[data-chip]").forEach((chip) => {
      const box = chip.getBoundingClientRect();
      if (box.width === 0) return;
      const pos = { x: box.left - origin.left, y: box.top - origin.top };
      const prev = rects.current.get(chip.dataset.chip ?? "");
      next.set(chip.dataset.chip ?? "", pos);
      if (!prev || reduce || typeof chip.animate !== "function") return;
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) chip.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing });
    });
    rects.current = next;
  });

  const status = loading ? "Searching…" : visible.length === 0 ? "No matches" : `${visible.length} ${visible.length === 1 ? "option" : "options"}`;

  return (
    <div className="relative">
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div
        ref={shell}
        data-open={open}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        data-compact={compact || undefined}
        className={cn("sf-shell sf-multi", className)}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (disabled || target.closest(".sf-chip-x")) return;
          if (target !== input.current) event.preventDefault();
          input.current?.focus();
          if (target.closest("[data-more]")) return openList();
          if (open) {
            if (target !== input.current) closeList();
          } else openList();
        }}
      >
        {chips.map(({ value: v, item }) => (
          <span
            key={v}
            data-chip={v}
            data-label={item.text}
            data-new={fresh === v ? "" : undefined}
            data-leaving={leaving.includes(v) ? "" : undefined}
            onAnimationEnd={() => setFresh((f) => (f === v ? null : f))}
            className={cn(
              "sf-chip inline-flex h-(--size-chip) max-w-full shrink-0 cursor-default items-center gap-0.5 whitespace-nowrap rounded-full text-meta font-medium leading-none ring-1 ring-inset ring-border transition-[background-color,box-shadow] duration-(--duration-instant)",
              disabled ? "bg-transparent pr-2 text-muted-foreground" : "bg-secondary pr-0.5 text-secondary-foreground hover:bg-accent hover:ring-border-strong",
              avatarOf(v) ? "pl-0.5" : "pl-2",
            )}
          >
            {avatarOf(v) ? <Avatar email={avatarOf(v)!} size="xs" /> : null}
            <span className={cn("truncate pr-0.5", avatarOf(v) && "pl-1")} title={avatarOf(v) ?? undefined}>
              {avatarOf(v)?.split("@")[0] ?? item.text}
            </span>
            {disabled ? null : (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Remove ${item.text}`}
                onClick={() => {
                  removeValue(v);
                  input.current?.focus();
                }}
                className="sf-chip-x relative inline-grid size-[18px] shrink-0 place-items-center rounded-full text-muted-foreground transition-ui before:absolute before:-inset-[3px] hover:bg-state-pressed hover:text-foreground active:scale-(--scale-press)"
              >
                <CloseGlyph className="size-2.5" />
              </button>
            )}
          </span>
        ))}
        {overflow.count > 0 ? (
          <button
            type="button"
            data-more=""
            tabIndex={-1}
            aria-label={`${overflow.count} more selected: ${overflow.names.join(", ")}. Open list`}
            className="inline-flex h-(--size-chip) shrink-0 cursor-pointer items-center rounded-full bg-control-off px-2 text-meta font-medium leading-none tabular text-foreground transition-ui active:scale-(--scale-press)"
          >
            +{overflow.count}
          </button>
        ) : null}
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && visible.length && !loading ? optionId(active) : undefined}
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={selected.length ? "" : placeholder}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            if (shell.current?.contains(event.relatedTarget as Node | null)) return;
            closeList();
            if (query) {
              setQuery("");
              onQueryChange?.("");
            }
          }}
          className="sf-input"
          {...aria}
        />
        {invalid ? <AlertGlyph className="sf-pop mx-1" /> : null}
        {loading ? <Spinner className="sf-pop mx-1" /> : null}
        <span className="sf-chev" aria-hidden="true">
          <ChevronGlyph />
        </span>
      </div>
      <div className="sr-only" aria-live="polite" role="status">
        {announcement || (open ? status : "")}
      </div>

      <Popover open={open} onDismiss={closeList} anchorRef={shell} width={popWidth || undefined} className="p-1">
        <div className="flex min-h-0 flex-1 flex-col" onMouseDown={keepFocus}>
          <ListboxSurface
            listId={listId}
            items={visible}
            activeIndex={active}
            isSelected={(v) => selected.includes(v)}
            optionId={optionId}
            onHover={setActive}
            onPick={toggle}
            multi
            query={query}
            loading={loading}
            emptyTitle={emptyTitle}
            emptyHint={emptyHint}
            aria-label={aria["aria-label"] ?? (aria["aria-labelledby"] ? undefined : "Options")}
            aria-labelledby={aria["aria-labelledby"]}
          />
        </div>
      </Popover>
    </div>
  );
}
