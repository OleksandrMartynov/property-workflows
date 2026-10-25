"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
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

export type ComboboxOption = PickerOption;

interface ComboboxProps {
  options: ComboboxOption[];
  name?: string;
  id?: string;
  defaultValue?: string;
  /** Керований режим: значення задає батько; вибір лише викликає onValueChange. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Текст у порожньому полі. Варіант із `value: ""` (наприклад, «Unassigned») показується саме як цей текст. */
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Варіанти ще вантажаться (асинхронний пошук): у полі спінер, у списку скелет. */
  loading?: boolean;
  /** Кнопка «очистити» (за замовчуванням є). */
  clearable?: boolean;
  /** Викликається при кожній зміні тексту: так батько підвантажує варіанти з сервера. */
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

/**
 * Поле з автодоповненням (ARIA 1.2 combobox): фокус лишається в полі, список — окремий listbox на `Popover`,
 * активний варіант — `aria-activedescendant`. Вільного тексту немає: Esc або вихід з поля повертають підпис
 * вибраного. Значення йде у форму через прихований input. Типове застосування — вибір виконавця (аватар, email, роль).
 */
export function Combobox({
  options,
  name,
  id: idProp,
  defaultValue = "",
  value,
  onValueChange,
  placeholder = "Select…",
  disabled,
  required,
  loading = false,
  clearable = true,
  onQueryChange,
  filter = true,
  emptyTitle = "No matches",
  emptyHint,
  className,
  ...ariaProps
}: ComboboxProps) {
  const { id, aria, invalid } = useFieldAria(idProp, ariaProps);
  const items = options.map(toItem);
  const reactId = useId();
  const listId = `${reactId}-list`;
  const shell = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const [open, setOpen] = useState(false);
  const [popWidth, setPopWidth] = useState(0);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);

  const current = items.find((o) => o.value === selected);
  const chosen = current && current.value !== "" ? current : undefined;
  const visible = filter && typing ? filterItems(items, query) : items;
  const optionId = (i: number) => `${reactId}-o${i}`;
  const filled = Boolean(chosen) || Boolean(query);
  const shown = typing ? query : chosen ? current!.text : "";
  const hint = !typing && current && current.value === "" ? current.text : placeholder;

  const setValue = (next: string) => {
    setInternal(next);
    onValueChange?.(next);
  };
  const show = () => {
    setPopWidth(Math.max(shell.current?.offsetWidth ?? 0, 180));
    setOpen(true);
  };
  const openList = () => {
    if (disabled || open) return;
    const at = visible.findIndex((o) => o.value === selected && !o.disabled);
    setActive(at >= 0 ? at : firstEnabled(visible));
    show();
  };
  const closeList = () => setOpen(false);
  const resetText = () => {
    setQuery("");
    setTyping(false);
  };
  const changeQuery = (next: string) => {
    setQuery(next);
    setTyping(true);
    setActive(firstEnabled(filter ? filterItems(items, next) : items));
    show();
    onQueryChange?.(next);
  };
  const choose = (index: number) => {
    const option = visible[index];
    if (!option || option.disabled) return;
    setValue(option.value);
    resetText();
    closeList();
    onQueryChange?.("");
  };
  const clear = () => {
    setValue("");
    resetText();
    onQueryChange?.("");
    input.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      else setActive((a) => stepEnabled(visible, a, key === "ArrowDown" ? 1 : -1));
    } else if ((key === "Home" || key === "End") && open && !typing) {
      event.preventDefault();
      setActive(key === "Home" ? stepEnabled(visible, -1, 1) : stepEnabled(visible, visible.length, -1));
    } else if (key === "PageDown" || key === "PageUp") {
      if (!open) return;
      event.preventDefault();
      let next = active;
      for (let n = 0; n < 5; n++) next = stepEnabled(visible, next, key === "PageDown" ? 1 : -1);
      setActive(next);
    } else if (key === "Enter") {
      // Enter у полі вибору ніколи не відправляє форму: відправка — кнопкою або ⌘/Ctrl + Enter.
      event.preventDefault();
      if (open && visible[active]) choose(active);
    } else if (key === "Escape") {
      if (open) {
        event.preventDefault();
        closeList();
        if (typing) {
          resetText();
          onQueryChange?.("");
        }
      } else if (typing) {
        event.preventDefault();
        resetText();
        onQueryChange?.("");
      } else if (clearable && chosen) {
        event.preventDefault();
        setValue("");
      }
    } else if (key === "Tab") {
      closeList();
    }
  };

  const status = loading ? "Searching…" : visible.length === 0 ? "No matches" : `${visible.length} ${visible.length === 1 ? "result" : "results"}`;

  return (
    <div className="relative">
      {/* Браузер не перевіряє hidden-поля: обов'язковість — aria-required на видимому контролі, перевірка — на сервері. */}
      <input type="hidden" name={name} value={selected} disabled={disabled} />
      <div
        ref={shell}
        data-open={open}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn("sf-shell", className)}
        onPointerDown={(event) => {
          if (disabled || (event.target as HTMLElement).closest(".sf-iconbtn")) return;
          if (event.target !== input.current) {
            event.preventDefault();
            input.current?.focus();
            if (open) closeList();
            else openList();
          } else if (!open) openList();
        }}
      >
        {chosen?.leading && !typing ? (
          <span aria-hidden="true" className="sf-pop -ml-0.5 inline-grid shrink-0 place-items-center [&_[data-avatar]>span]:size-5 [&_[data-avatar]>span]:text-[10px]">
            {chosen.leading}
          </span>
        ) : null}
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-required={required || undefined}
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && visible.length && !loading ? optionId(active) : undefined}
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={hint}
          value={shown}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            // Фокус пішов за межі поля (клік у список фокус не забирає): закрити й повернути підпис вибраного.
            if (shell.current?.contains(event.relatedTarget as Node | null)) return;
            closeList();
            resetText();
          }}
          className="sf-input"
          {...aria}
        />
        {invalid ? <AlertGlyph className="sf-pop mx-1" /> : null}
        {loading ? <Spinner className="sf-pop mx-1" /> : null}
        {clearable && filled && !disabled ? (
          <button
            type="button"
            aria-label="Clear"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            className="sf-iconbtn sf-pop"
          >
            <CloseGlyph />
          </button>
        ) : null}
        <span className="sf-chev" aria-hidden="true">
          <ChevronGlyph />
        </span>
      </div>
      <div className="sr-only" aria-live="polite" role="status">
        {open ? status : ""}
      </div>

      <Popover open={open} onDismiss={closeList} anchorRef={shell} width={popWidth || undefined} className="p-1">
        <div className="flex min-h-0 flex-1 flex-col" onMouseDown={keepFocus}>
          <ListboxSurface
            listId={listId}
            items={visible}
            activeIndex={active}
            isSelected={(v) => v === selected && v !== ""}
            optionId={optionId}
            onHover={setActive}
            onPick={choose}
            query={typing ? query : ""}
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
