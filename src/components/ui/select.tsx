"use client";

import { Children, isValidElement, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertGlyph, fieldClass, fieldHeight } from "./input";
import {
  ChevronGlyph,
  filterItems,
  firstEnabled,
  keepFocus,
  ListboxSearch,
  ListboxSurface,
  Spinner,
  stepEnabled,
  textOf,
  useFieldAria,
  type ListboxItem,
} from "./listbox-parts";
import { Popover } from "./popover";

/** Варіант для `options={[…]}` — альтернатива `<option>` у дітях, коли потрібні опис, ведучий вузол чи позначка. */
export interface SelectOption {
  value: string;
  label: ReactNode;
  /** Текст для пошуку й набору літер, якщо `label` не рядок (інакше береться з нього). */
  text?: string;
  description?: string;
  /** Крапка статусу, аватар, іконка перед підписом (лише декор). */
  leading?: ReactNode;
  /** Роль, скорочення праворуч від підпису. */
  trailing?: ReactNode;
  disabled?: boolean;
  group?: string;
}

/** `<option>` і `<optgroup>` у дітях перетворюємо на плаский список варіантів: API лишається як у нативного select. */
function parseOptions(children: ReactNode, group?: string): ListboxItem[] {
  const items: ListboxItem[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement<ComponentProps<"option"> & ComponentProps<"optgroup">>(child)) continue;
    if (child.type === "optgroup") {
      items.push(...parseOptions(child.props.children, child.props.label));
    } else if (child.type === "option") {
      // Для набору літер і пошуку: атрибут label, інакше текст дітей (діти можуть бути JSX).
      const text = child.props.label ?? textOf(child.props.children);
      items.push({ value: String(child.props.value ?? text), label: child.props.children, text, disabled: Boolean(child.props.disabled), group });
    }
  }
  return items;
}

const fromOptions = (options: SelectOption[]): ListboxItem[] =>
  options.map((o) => ({ ...o, text: o.text ?? textOf(o.label) }));

interface SelectProps {
  name?: string;
  id?: string;
  defaultValue?: string;
  /** Керований режим: значення задає батько; вибір лише викликає onValueChange. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Текст, поки нічого не вибрано (значення «» або немає такого варіанта). */
  placeholder?: string;
  /** Рядок пошуку над списком. За замовчуванням вмикається, коли варіантів більше 8. */
  searchable?: boolean;
  /** Варіанти з описом, ведучим вузлом і групами — замість `<option>` у дітях (діти тоді ігноруються). */
  options?: SelectOption[];
  /** Варіанти ще вантажаться: у полі спінер, у списку скелет рядків. */
  loading?: boolean;
  /** Текст порожнього результату пошуку. */
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

/**
 * Вибір зі списку без системного списку: кнопка-комбобокс (ARIA «select-only combobox») і наш listbox на скляному
 * `Popover` (виходить за межі `overflow` батьків, перевертається вгору, коли знизу тісно).
 * Значення йде у форму через прихований input, тож server actions читають його як у звичайного select.
 * Клавіатура: ↑ ↓ Home End, Enter / Пропуск — вибрати, Esc — закрити, набір літер — перейти до варіанта.
 * Довгі списки (> 8) отримують пошук: фокус переходить у рядок пошуку, ↑ ↓ і Enter працюють звідти.
 */
export function Select({
  name,
  id: idProp,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select…",
  searchable,
  options: optionsProp,
  loading = false,
  emptyTitle = "No matches",
  emptyHint,
  className,
  children,
  disabled,
  required,
  ...ariaProps
}: SelectProps) {
  const { id, aria, invalid } = useFieldAria(idProp, ariaProps);
  const items = optionsProp ? fromOptions(optionsProp) : parseOptions(children);
  const withSearch = searchable ?? items.length > 8;
  const reactId = useId();
  const listId = `${reactId}-list`;
  const button = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value ?? "");
  const selected = value ?? internal;
  const [open, setOpen] = useState(false);
  const [popWidth, setPopWidth] = useState(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const current = items.find((o) => o.value === selected);
  // Порожнє значення — це «нічого не вибрано»: показуємо приглушений підпис, а не звичайний текст.
  const placeholderShown = !current || current.value === "";
  const visible = filterItems(items, query);
  const optionId = (i: number) => `${reactId}-o${i}`;

  const openList = (seed = "") => {
    if (disabled) return;
    setPopWidth(Math.max(button.current?.offsetWidth ?? 0, 180));
    setQuery(seed);
    const list = filterItems(items, seed);
    const at = list.findIndex((o) => o.value === selected && !o.disabled);
    setActive(at >= 0 ? at : firstEnabled(list));
    setOpen(true);
  };
  const closeList = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  };
  const commit = (next: string) => {
    setInternal(next);
    onValueChange?.(next);
  };
  const choose = (index: number) => {
    const option = visible[index];
    if (!option || option.disabled) return;
    commit(option.value);
    closeList(true);
  };

  const onListKeys = (event: KeyboardEvent<HTMLElement>, inSearch: boolean) => {
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else setActive((a) => stepEnabled(visible, a, key === "ArrowDown" ? 1 : -1));
    } else if ((key === "Home" || key === "End") && !inSearch) {
      if (!open) return;
      event.preventDefault();
      setActive(key === "Home" ? stepEnabled(visible, -1, 1) : stepEnabled(visible, visible.length, -1));
    } else if (key === "Enter" || (key === " " && !inSearch)) {
      event.preventDefault();
      if (open) choose(active);
      else openList();
    } else if (key === "Escape" && open) {
      event.preventDefault();
      closeList(true);
    } else if (key === "Tab") {
      closeList();
    }
  };

  const onButtonKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    onListKeys(event, false);
    const { key } = event;
    if (key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey || key === " ") return;
    if (withSearch) {
      // У довгому списку перший символ відкриває пошук із цим символом.
      event.preventDefault();
      if (!open) openList(key);
      return;
    }
    const now = Date.now();
    typed.current = { text: now - typed.current.at > 600 ? key.toLowerCase() : typed.current.text + key.toLowerCase(), at: now };
    const hit = visible.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(typed.current.text));
    if (hit < 0) return;
    if (open) {
      setActive(hit);
    } else if (!current) {
      // Select-команда («Assign all to…», значення порожнє): набір літер лише відкриває список, не виконує дію.
      openList();
      setActive(hit);
    } else {
      commit(visible[hit].value);
    }
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} required={required} />
      <button
        ref={button}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && !withSearch && visible.length ? optionId(active) : undefined}
        aria-busy={loading || undefined}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onButtonKeys}
        className={cn(
          fieldClass,
          fieldHeight.md,
          "press bg-field! disabled:bg-muted! flex cursor-default items-center justify-between gap-2 pr-2 text-left select-none",
          open && !invalid && "border-ring",
          className,
        )}
        {...aria}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {current?.leading && !placeholderShown ? <span className="inline-grid shrink-0 place-items-center">{current.leading}</span> : null}
          <span className={cn("min-w-0 truncate", placeholderShown && "text-muted-foreground")}>{current ? current.label : placeholder}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {invalid ? <AlertGlyph className="sf-pop" /> : null}
          {loading ? (
            <Spinner className="sf-pop" />
          ) : (
            <span className="sf-chev">
              <ChevronGlyph />
            </span>
          )}
        </span>
      </button>

      <Popover open={open} onDismiss={() => closeList()} anchorRef={button} width={popWidth || undefined} className="p-1">
        {/* Клік у списку не відбирає фокус у кнопки чи рядка пошуку. */}
        <div className="flex min-h-0 flex-1 flex-col" onMouseDown={keepFocus}>
          {withSearch ? (
            <ListboxSearch
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={visible.length ? optionId(active) : undefined}
              aria-label="Search options"
              autoComplete="off"
              placeholder="Search…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(firstEnabled(filterItems(items, event.target.value)));
              }}
              onKeyDown={(event) => onListKeys(event, true)}
            />
          ) : null}
          <ListboxSurface
            listId={listId}
            items={visible}
            activeIndex={active}
            isSelected={(v) => v === selected && v !== ""}
            optionId={optionId}
            onHover={setActive}
            onPick={choose}
            query={withSearch ? query : ""}
            loading={loading}
            emptyTitle={emptyTitle}
            emptyHint={emptyHint}
            aria-label={aria["aria-label"]}
            aria-labelledby={aria["aria-labelledby"]}
          />
        </div>
      </Popover>
    </div>
  );
}
