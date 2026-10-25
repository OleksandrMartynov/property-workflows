"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { MoreIcon } from "./icons";
import { Popover } from "./popover";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Незворотна дія (видалення): текст `destructive`, перед нею — розділювач. */
  destructive?: boolean;
  /** Розділювач перед пунктом. */
  separated?: boolean;
}

/**
 * Меню дій рядка («⋯»): кнопка-іконка з підписом для читача екрана, список `role="menu"` у плаваючій поверхні.
 * ↑ ↓ Home End — між пунктами, Enter / Space — вибрати, Esc і Tab — закрити (фокус повертається на кнопку).
 * Вибір закриває меню, і лише потім викликає дію — щоб діалог підтвердження отримав фокус.
 */
export function ActionMenu({ label, items, className }: { label: string; items: ActionMenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  const enabled = useCallback(
    () => Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []),
    [],
  );

  useEffect(() => {
    if (open) requestAnimationFrame(() => enabled()[0]?.focus());
  }, [open, enabled]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = enabled();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => all[(i + all.length) % all.length]?.focus();
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(all.length - 1);
    else if (event.key === "Escape") close();
    else if (event.key === "Tab") close(false);
    else return;
    event.preventDefault();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className={buttonVariants({ variant: "ghost", size: "icon", className: cn("size-7 text-muted-foreground hover:text-foreground aria-expanded:bg-state-pressed aria-expanded:text-foreground", className) })}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <MoreIcon />
      </button>
      <Popover open={open} onDismiss={() => close(false)} anchorRef={trigger} matchWidth={false} width={232} align="end" className="p-1">
        <div ref={list} id={id} role="menu" aria-label={label} className="flex flex-col" onKeyDown={onListKey}>
          {items.map((item) => (
            <div key={item.label} className="contents">
              {item.separated || item.destructive ? <div role="separator" className="my-1 h-px bg-border" /> : null}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-xs px-2 text-left text-body transition-ui hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&>svg]:text-muted-foreground",
                  item.destructive ? "text-destructive [&>svg]:text-destructive" : "text-popover-foreground",
                )}
                onClick={() => {
                  close();
                  requestAnimationFrame(item.onSelect);
                }}
              >
                {item.icon}
                <span className="min-w-0 flex-1 break-words">{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      </Popover>
    </>
  );
}
