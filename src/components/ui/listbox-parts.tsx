"use client";

import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { useFieldControl } from "./field";
import "./select-family.css";

/** Варіант списку у вигляді, спільному для Select, Combobox і MultiSelect. */
export interface ListboxItem {
  value: string;
  /** Підпис: рядок підсвічується збігом, вузол показується як є. */
  label: ReactNode;
  /** Текст підпису для пошуку й набору літер. */
  text: string;
  description?: string;
  /** Вузол перед підписом: крапка статусу, аватар, іконка. Лише декор. */
  leading?: ReactNode;
  /** Вузол перед позначкою вибору: роль, скорочення. */
  trailing?: ReactNode;
  disabled?: boolean;
  group?: string;
}

/** Публічний опис варіанта для `options={[…]}`. */
export interface PickerOption {
  value: string;
  label: string;
  description?: string;
  /** Email для аватара-ініціалів (Combobox і MultiSelect малюють `Avatar` самі). */
  avatar?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  group?: string;
}

/** Варіант → рядок списку: аватар з email (якщо є) стає ведучим вузлом. */
export const toItem = (o: PickerOption): ListboxItem => ({
  value: o.value,
  label: o.label,
  text: o.label,
  description: o.description,
  leading:
    o.leading ??
    (o.avatar ? (
      // Аватар у рядку списку 24 px (дочірній span із Avatar), у полі — 20 px: див. Combobox.
      <span data-avatar="" className="inline-grid [&>span]:size-6 [&>span]:text-[11px]">
        <Avatar email={o.avatar} />
      </span>
    ) : undefined),
  trailing: o.trailing,
  disabled: o.disabled,
  group: o.group,
});

type FieldAria = {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * Усередині `Field` контрол сам бере id, `aria-describedby` (підказка, помилка) і `aria-invalid`; явні пропси сильніші.
 * Повертає також `invalid` як boolean для візуального стану.
 */
export function useFieldAria<T extends FieldAria>(id: string | undefined, aria: T) {
  const field = useFieldControl();
  const merged = {
    ...aria,
    "aria-describedby": aria["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": aria["aria-invalid"] ?? (field?.invalid ? true : undefined),
  };
  const invalid = merged["aria-invalid"] === true || merged["aria-invalid"] === "true";
  return { id: id ?? field?.id, aria: merged, invalid };
}

export const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return Children.toArray(node).map(textOf).join("");
};

/** Пошук без урахування регістру по підпису й опису. */
export function filterItems<T extends ListboxItem>(items: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => item.text.toLowerCase().includes(needle) || (item.description ?? "").toLowerCase().includes(needle));
}

/** Індекс наступного доступного варіанта в бік `step`; на краю лишається на місці. */
export function stepEnabled(items: ListboxItem[], from: number, step: 1 | -1): number {
  for (let i = from + step; i >= 0 && i < items.length; i += step) if (!items[i].disabled) return i;
  return from;
}

export const firstEnabled = (items: ListboxItem[]) => Math.max(0, items.findIndex((item) => !item.disabled));

/** Підсвітка збігу в тексті (`bg-match` — токен, у forced-colors стає системним). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[2px] bg-match px-px text-foreground">{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

export function ChevronGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4", className)}>
      <path d="M3.5 6L8 10.5 12.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-3.5", className)}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4 shrink-0", className)}>
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.25 10.25l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Спінер завантаження варіантів: дуга на колі, обертається `animate-ui-spin` (за reduced motion — повільніше). */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("animate-ui-spin size-4 text-muted-foreground", className)}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" className="opacity-25" />
      <path d="M8 2.5a5.5 5.5 0 015.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const CheckGlyph = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface OptionRowProps {
  id: string;
  index: number;
  item: ListboxItem;
  selected: boolean;
  active: boolean;
  multi: boolean;
  query: string;
  onHover: (index: number) => void;
  onPick: (index: number) => void;
}

function OptionRow({ id, index, item, selected, active, multi, query, onHover, onPick }: OptionRowProps) {
  const rich = Boolean(item.description);
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={item.disabled || undefined}
      data-index={index}
      data-active={active ? "" : undefined}
      onPointerMove={() => !item.disabled && !active && onHover(index)}
      onClick={() => onPick(index)}
      className={cn(
        "group/opt relative flex cursor-default select-none items-center gap-2 rounded-xs px-2 text-label text-popover-foreground",
        "min-h-(--size-option) transition-transform duration-(--duration-fast) ease-(--spring-snappy)",
        "aria-disabled:cursor-not-allowed aria-disabled:text-muted-foreground not-aria-disabled:active:scale-(--scale-press)",
        rich && "min-h-(--size-option-rich) py-1",
      )}
    >
      {multi ? (
        <span className="sf-box" aria-hidden="true">
          <svg viewBox="0 0 12 12">
            <path d="M2.5 6.25l2.25 2.25L9.5 3.5" pathLength="1" />
          </svg>
        </span>
      ) : null}
      {item.leading ? <span className="inline-grid shrink-0 place-items-center text-muted-foreground">{item.leading}</span> : null}
      <span className="grid min-w-0 flex-1">
        <span className="truncate">{typeof item.label === "string" ? <Highlight text={item.label} query={query} /> : item.label}</span>
        {item.description ? (
          <span className="truncate text-meta text-muted-foreground group-data-[active]/opt:text-foreground/70 group-aria-disabled/opt:text-muted-foreground">
            <Highlight text={item.description} query={query} />
          </span>
        ) : null}
      </span>
      {item.trailing || !multi ? (
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {item.trailing}
          {multi ? null : (
            <span
              aria-hidden="true"
              className="text-primary opacity-0 scale-[0.6] transition-[opacity,transform] duration-(--duration-fast) ease-(--spring-snappy) group-aria-selected/opt:scale-100 group-aria-selected/opt:opacity-100"
            >
              <CheckGlyph />
            </span>
          )}
        </span>
      ) : null}
    </div>
  );
}

/** Скелет списку під час завантаження варіантів: форма майбутніх рядків (аватар і два рядки тексту). */
export function ListboxLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading options" className="grid gap-1 p-0">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-(--size-option-rich) items-center gap-2 px-2">
          <div aria-hidden="true" className="skeleton size-5 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <div aria-hidden="true" className="skeleton h-2 rounded-xs" style={{ width: `${70 - i * 12}%` }} />
            <div aria-hidden="true" className="skeleton h-2 rounded-xs" style={{ width: `${44 - i * 6}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListboxEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div role="status" className="sf-enter grid justify-items-center gap-1 px-4 py-5 text-center">
      <SearchGlyph className="mb-1 size-5 text-muted-foreground" />
      <b className="text-label font-medium">{title}</b>
      {hint ? <span className="max-w-[28ch] text-meta text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

interface ListboxSurfaceProps {
  /** Ідентифікатор елемента `role="listbox"`: на нього вказує `aria-controls` власника. */
  listId: string;
  items: ListboxItem[];
  activeIndex: number;
  isSelected: (value: string) => boolean;
  optionId: (index: number) => string;
  onHover: (index: number) => void;
  onPick: (index: number) => void;
  multi?: boolean;
  query?: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * Вміст поверхні списку: прокручувана область, ковзна підсвітка активного варіанта, групи, порожній і завантажувальний
 * стани. Підсвітка — один елемент, що їде до активного рядка пружиною (перше показ — без руху, щоб не «злітала»);
 * активний рядок завжди в зоні видимості. Рендериться лише всередині відкритого `Popover`.
 */
export function ListboxSurface({
  listId,
  items,
  activeIndex,
  isSelected,
  optionId,
  onHover,
  onPick,
  multi = false,
  query = "",
  loading = false,
  emptyTitle = "No matches",
  emptyHint,
  ...aria
}: ListboxSurfaceProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const hl = useRef<HTMLSpanElement>(null);
  const showList = !loading && items.length > 0;

  useLayoutEffect(() => {
    const el = hl.current;
    const host = list.current;
    const scroller = wrap.current;
    const option = showList && host ? host.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`) : null;
    if (!el || !host || !scroller) return;
    if (!option) {
      el.removeAttribute("data-on");
      return;
    }
    const cold = !el.hasAttribute("data-on");
    if (cold) el.style.transition = "none";
    el.style.height = `${option.offsetHeight}px`;
    el.style.transform = `translateY(${option.offsetTop}px)`;
    if (cold) {
      void el.offsetWidth;
      el.style.transition = "";
    }
    el.setAttribute("data-on", "");
    // Активний варіант не ховається за краєм прокрутки (відступ 4 px).
    const box = scroller.getBoundingClientRect();
    const rect = option.getBoundingClientRect();
    if (rect.top < box.top + 4) scroller.scrollTop -= box.top + 4 - rect.top;
    else if (rect.bottom > box.bottom - 4) scroller.scrollTop += rect.bottom - (box.bottom - 4);
  }, [activeIndex, items, showList]);

  // Групи: послідовні варіанти з однаковим `group` складаються в одну групу з підписом.
  const groups: Array<{ name?: string; entries: Array<{ item: ListboxItem; index: number }> }> = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.entries.push({ item, index });
    else groups.push({ name: item.group, entries: [{ item, index }] });
  });

  return (
    <div ref={wrap} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: "var(--size-listbox-max)" }}>
      {loading ? <ListboxLoading /> : null}
      {!loading && items.length === 0 ? <ListboxEmpty title={emptyTitle} hint={emptyHint} /> : null}
      <div
        ref={list}
        id={listId}
        role="listbox"
        aria-multiselectable={multi || undefined}
        aria-busy={loading || undefined}
        hidden={!showList}
        className="relative grid content-start"
        {...aria}
      >
        <span ref={hl} aria-hidden="true" className="sf-hl" />
        {groups.map((group, g) => {
          const labelId = `${listId}-g${g}`;
          return (
            <Fragment key={`${group.name ?? ""}-${g}`}>
              <div
                role={group.name ? "group" : "presentation"}
                aria-labelledby={group.name ? labelId : undefined}
                className={cn(g > 0 && "mt-1 border-t border-border pt-1")}
              >
                {group.name ? (
                  <div id={labelId} role="presentation" className="px-2 pb-1 pt-2 text-meta font-medium text-muted-foreground">
                    {group.name}
                  </div>
                ) : null}
                {group.entries.map(({ item, index }) => (
                  <OptionRow
                    key={item.value}
                    id={optionId(index)}
                    index={index}
                    item={item}
                    selected={isSelected(item.value)}
                    active={index === activeIndex}
                    multi={multi}
                    query={query}
                    onHover={onHover}
                    onPick={onPick}
                  />
                ))}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** Клік усередині плаваючої поверхні не відбирає фокус у поля чи кнопки (крім самого поля пошуку). */
export function keepFocus(event: { target: EventTarget; preventDefault: () => void }) {
  if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
}

/**
 * Рядок пошуку над списком Select. Поверхня `Popover` на мить прихована (visibility), поки обчислюється позиція,
 * а сховане поле не отримує фокус — тож фокусуємо на наступному кадрі.
 */
export function ListboxSearch(props: ComponentProps<"input">) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="-mx-1 -mt-1 mb-1 flex items-center gap-2 border-b border-border px-3 text-muted-foreground">
      <SearchGlyph />
      <input
        ref={ref}
        {...props}
        className="h-9 min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
      />
    </div>
  );
}
