"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ROLE_INFO } from "@/lib/roles";
import { clearRecent } from "@/lib/recent-runs";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { CheckIcon, ChevronsUpDownIcon, LockIcon, LogOutIcon, PanelLeftIcon, SearchIcon } from "./icons";
import { RoleBadge } from "./role-badge";

type Variant = "full" | "rail" | "bar";

const PANEL: Record<Variant, string> = {
  full: "bottom-full left-0 mb-2 origin-bottom-left",
  rail: "bottom-0 left-full ml-2 origin-bottom-left",
  bar: "top-full right-0 mt-2 origin-top-right",
};

function Item({ icon, label, hint, type = "button", onClick }: { icon: ReactNode; label: string; hint?: string; type?: "button" | "submit"; onClick?: () => void }) {
  return (
    <button
      type={type}
      role="menuitem"
      data-menu-item
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2.5 rounded-sm px-2 text-left text-label transition-ui hover:bg-state-hover focus-visible:bg-state-hover focus-visible:outline-offset-[-2px]"
    >
      <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint ? <kbd className="rounded-xs border border-border bg-muted px-1 font-sans text-[11px] leading-4 text-muted-foreground">{hint}</kbd> : null}
    </button>
  );
}

/**
 * Меню користувача: хто ти, яка роль і що вона дозволяє (✓ можна, 🔒 не можна), пошук, згортання панелі, вихід.
 * Роль видно й на кнопці-тригері: аватар із кільцем для адміністратора і бейдж.
 */
export function UserMenu({
  email,
  role,
  variant,
  collapsed = false,
  onSearch,
  onToggleSidebar,
  signOutAction,
}: {
  email: string;
  role?: string;
  variant: Variant;
  collapsed?: boolean;
  onSearch: () => void;
  onToggleSidebar?: () => void;
  signOutAction: () => Promise<void>;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const open = phase === "open";
  const info = role ? ROLE_INFO[role] : undefined;

  const close = (restoreFocus = false) => {
    setPhase((p) => (p === "open" ? "closing" : p));
    if (restoreFocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => setPhase("closed"), 140);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>("[data-menu-item]")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPhase("closing");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = [...(root.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [])];
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Tab") {
      close();
    }
  };

  const avatar = <Avatar email={email} className={cn("size-7 text-[11px]", role === "admin" && "ring-2 ring-primary/60 ring-offset-2 ring-offset-sidebar")} />;

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={variant === "full" ? undefined : `Account menu, ${email}`}
        onClick={() => (open ? close() : setPhase("open"))}
        className={cn(
          "flex items-center gap-2.5 rounded-sm text-left transition-ui hover:bg-state-hover",
          variant === "full" ? "w-full p-1.5" : "p-1",
          open && "bg-state-hover",
        )}
      >
        {avatar}
        {variant === "full" && !collapsed ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <span data-testid="user-email" className="w-full truncate text-label leading-4" title={email}>
                {email}
              </span>
              {role ? <RoleBadge data-testid="user-role" role={role} className="h-4 pl-1 pr-1.5 text-[11px]" /> : null}
            </span>
            <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
          </>
        ) : null}
      </button>

      {phase !== "closed" ? (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-label="Account"
          className={cn(
            "absolute z-50 w-72 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg",
            PANEL[variant],
            phase === "closing" ? "animate-ui-fall pointer-events-none" : "animate-ui-rise",
          )}
        >
          <div className="flex items-center gap-2.5 p-2">
            <Avatar email={email} className="size-8 text-xs" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate text-label font-medium" title={email}>
                {email}
              </p>
              {role ? (
                <p className="flex items-center gap-1.5">
                  <RoleBadge role={role} />
                  {info ? <span className="text-meta text-muted-foreground">{info.who}</span> : null}
                </p>
              ) : null}
            </div>
          </div>

          {info ? (
            <div className="mx-1 mb-1.5 flex flex-col gap-2.5 rounded-sm bg-muted/60 p-2.5">
              <ul className="flex flex-col gap-1.5" aria-label="You can">
                {info.can.map((text) => (
                  <li key={text} className="flex items-start gap-2 text-meta">
                    <CheckIcon className="mt-px size-3.5 text-status-done-mark" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <ul className="flex flex-col gap-1.5 text-muted-foreground" aria-label="You cannot">
                {info.cannot.map((text) => (
                  <li key={text} className="flex items-start gap-2 text-meta">
                    <LockIcon className="mt-px size-3.5" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div role="separator" className="my-1 h-px bg-border" />
          <Item
            icon={<SearchIcon />}
            label="Search"
            hint="⌘K"
            onClick={() => {
              close();
              onSearch();
            }}
          />
          {onToggleSidebar ? (
            <Item
              icon={<PanelLeftIcon />}
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              hint="["
              onClick={() => {
                close();
                onToggleSidebar();
              }}
            />
          ) : null}
          <form action={signOutAction} onSubmit={() => clearRecent()}>
            <Item type="submit" icon={<LogOutIcon />} label="Sign out" />
          </form>
        </div>
      ) : null}
    </div>
  );
}
