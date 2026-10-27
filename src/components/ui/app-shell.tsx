"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { ChevronsUpDownIcon, LogOutIcon, PanelLeftIcon } from "./icons";
import { Popover } from "./popover";
import "./shell.css";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Home", icon: "M3 8.5 8 4l5 4.5V13H9.5v-3h-3v3H3z" },
  { href: "/templates", label: "Templates", icon: "M3.5 3h9v10h-9zM6 6h4M6 8.5h4M6 11h2" },
  { href: "/runs", label: "Runs", icon: "M3 4.5h10M3 8h10M3 11.5h6" },
] as const;

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4 shrink-0 text-muted-foreground">
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

const SIDEBAR_KEY = "pw.sidebar";
let sidebarCollapsed: boolean | null = null;
const readCollapsed = () => {
  if (sidebarCollapsed === null) {
    try {
      sidebarCollapsed = window.localStorage.getItem(SIDEBAR_KEY) === "collapsed";
    } catch {
      sidebarCollapsed = false;
    }
  }
  return sidebarCollapsed;
};
const subscribeCollapsed = (notify: () => void) => {
  window.addEventListener("pw-sidebar", notify);
  return () => window.removeEventListener("pw-sidebar", notify);
};
const writeCollapsed = (value: boolean) => {
  sidebarCollapsed = value;
  try {
    window.localStorage.setItem(SIDEBAR_KEY, value ? "collapsed" : "expanded");
  } catch {}
  window.dispatchEvent(new Event("pw-sidebar"));
};

/**
 * Акаунт у футері сайдбара: кнопка (аватар + повний email) відкриває вікно з email і роллю. Роль не висить бейджем у
 * панелі: це довідка про акаунт, а не навігація. Esc і клік поза вікном закривають його, фокус повертається на кнопку.
 */
function AccountMenu({ email, role, collapsed }: { email: string; role?: string; collapsed: boolean }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      anchor.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-account`}
        onClick={() => setOpen((value) => !value)}
        data-tip="Account"
        className="rail-tip flex w-full items-center gap-2 rounded-sm p-1.5 text-left text-label transition-ui hover:bg-state-hover aria-expanded:bg-state-hover group-data-[collapsed=true]/side:justify-center"
      >
        <Avatar email={email} />
        <span data-testid="user-email" className={collapsed ? "sr-only" : "min-w-0 flex-1 break-words leading-4"}>
          {email}
        </span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsed=true]/side:hidden" />
      </button>
      <Popover open={open} onDismiss={() => setOpen(false)} anchorRef={anchor} width={256} id={`${id}-account`} role="dialog" aria-label="Account">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-start gap-2.5">
            <Avatar email={email} size="md" />
            <span className="min-w-0 flex-1 break-words text-label font-medium leading-5">{email}</span>
          </div>
          {role ? (
            <dl className="flex items-center justify-between gap-3 border-t border-border pt-3 text-label">
              <dt className="text-muted-foreground">Role</dt>
              <dd data-testid="user-role" className="font-medium capitalize">
                {role}
              </dd>
            </dl>
          ) : null}
        </div>
      </Popover>
    </>
  );
}

/** Каркас застосунку: сайдбар 240 px (на вузьких екранах — верхня смуга), пошук і команди на ⌘K / Ctrl K. */
export function AppShell({
  email,
  role,
  signOutAction,
  children,
}: {
  email?: string | null;
  role?: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const toggleSidebar = useCallback(() => writeCollapsed(!readCollapsed()), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      // «[» згортає й розгортає панель, але не під час набору тексту.
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if (event.key === "[" && !event.metaKey && !event.ctrlKey && !event.altKey && !typing) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-label focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside
        data-collapsed={collapsed}
        className="shell-rail group/side sticky top-0 hidden h-dvh w-(--size-sidebar) shrink-0 flex-col gap-3 border-r border-sidebar-border bg-sidebar p-2 text-sidebar-foreground data-[collapsed=true]:w-(--size-sidebar-rail) md:flex"
      >
        <div className="flex items-center justify-between gap-1 group-data-[collapsed=true]/side:flex-col group-data-[collapsed=true]/side:gap-2">
          <Link href="/" aria-label="Property Workflows, home" className="flex h-9 items-center rounded-sm px-2 no-underline">
            <Logo showName={!collapsed} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-keyshortcuts="["
            data-tip={collapsed ? "Expand sidebar  [" : undefined}
            onClick={toggleSidebar}
            className="rail-tip text-muted-foreground"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
          data-tip="Search  ⌘K"
          className="rail-tip flex h-8 items-center gap-2 rounded-sm border border-sidebar-border bg-card px-2 text-label text-muted-foreground transition-ui hover:bg-state-hover group-data-[collapsed=true]/side:justify-center"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4 shrink-0">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="flex-1 text-left group-data-[collapsed=true]/side:hidden">Search…</span>
          <kbd className="rounded-xs border border-border bg-muted px-1 font-sans text-[11px] leading-4 text-muted-foreground group-data-[collapsed=true]/side:hidden">⌘K</kbd>
        </button>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              data-tip={item.label}
              className="rail-tip flex h-8 items-center gap-2 rounded-sm px-2 text-label text-sidebar-foreground transition-ui hover:bg-state-hover aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground group-data-[collapsed=true]/side:justify-center"
            >
              <NavIcon d={item.icon} />
              <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-3">
          {email ? <AccountMenu email={email} role={role} collapsed={collapsed} /> : null}
          <form action={signOutAction}>
            <Button type="submit" variant="outline" data-tip="Sign out" className="rail-tip w-full justify-start gap-2 text-foreground group-data-[collapsed=true]/side:justify-center">
              <LogOutIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className={collapsed ? "sr-only" : undefined}>Sign out</span>
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-(--size-header) items-center gap-1 border-b border-border bg-background px-3 md:hidden">
          <Link href="/" className="mr-2 flex items-center no-underline" aria-label="Property Workflows, home">
            <Logo showName={false} className="text-primary" />
          </Link>
          <nav aria-label="Main" className="flex flex-1 items-center gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="flex h-7 items-center rounded-sm px-2 text-label text-muted-foreground transition-ui aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5 text-foreground">
              <LogOutIcon className="size-3.5 text-muted-foreground" />
              Sign out
            </Button>
          </form>
        </header>
        <main id="content" tabIndex={-1} className="animate-ui-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} signOutAction={signOutAction} onToggleSidebar={toggleSidebar} collapsed={collapsed} />
    </div>
  );
}

type Command = { id: string; label: string; hint: string; run: () => void };

/** Палітра ⌘K: фільтр за словом, ↑ ↓ для вибору, Enter — виконати, Esc — закрити. */
function CommandPalette({ open, onClose, signOutAction, onToggleSidebar, collapsed }: { open: boolean; onClose: () => void; signOutAction: () => Promise<void>; onToggleSidebar: () => void; collapsed: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const go = (href: string) => () => router.push(href);
  const commands: Command[] = [
    { id: "home", label: "Go to Home", hint: "Navigate", run: go("/") },
    { id: "templates", label: "Go to Templates", hint: "Navigate", run: go("/templates") },
    { id: "runs", label: "Go to Runs", hint: "Navigate", run: go("/runs") },
    { id: "launch", label: "Launch a template", hint: "Action", run: go("/templates") },
    { id: "sidebar", label: collapsed ? "Expand sidebar" : "Collapse sidebar", hint: "[", run: onToggleSidebar },
    { id: "signout", label: "Sign out", hint: "Account", run: () => void signOutAction() },
  ];
  const needle = query.trim().toLowerCase();
  const shown = needle ? commands.filter((c) => c.label.toLowerCase().includes(needle)) : commands;
  const current = Math.min(active, Math.max(shown.length - 1, 0));

  const close = () => {
    setQuery("");
    setActive(0);
    onClose();
  };
  const run = (command: Command | undefined) => {
    if (!command) return;
    close();
    command.run();
  };

  return (
    <Dialog open={open} onClose={close} closable={false} size="lg" labelledBy={`${listId}-label`} className="mt-[14vh] overflow-hidden">
      <h2 id={`${listId}-label`} className="sr-only">
        Command palette
      </h2>
      <div className="flex items-center gap-2 border-b border-border px-4">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4 text-muted-foreground">
          <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={shown[current] ? `${listId}-${shown[current].id}` : undefined}
          aria-label="Search commands"
          autoComplete="off"
          value={query}
          placeholder="Type a command or search…"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current + 1) % Math.max(shown.length, 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current - 1 + shown.length) % Math.max(shown.length, 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              run(shown[current]);
            }
          }}
          className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground focus-visible:outline-none"
        />
        <kbd className="rounded-xs border border-border bg-muted px-1 font-sans text-[11px] leading-4 text-muted-foreground">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Commands" className="max-h-72 overflow-y-auto p-1.5">
        {shown.length === 0 ? (
          <li className="px-3 py-6 text-center text-body text-muted-foreground" role="presentation">
            No commands match “{query}”.
          </li>
        ) : (
          shown.map((command, index) => (
            <li
              key={command.id}
              id={`${listId}-${command.id}`}
              role="option"
              aria-selected={index === current}
              onMouseMove={() => setActive(index)}
              onClick={() => run(command)}
              className={cn(
                "flex h-9 cursor-default items-center justify-between rounded-sm px-3 text-body transition-ui",
                index === current && "bg-state-selected",
              )}
            >
              <span>{command.label}</span>
              <span className="text-meta text-muted-foreground">{command.hint}</span>
            </li>
          ))
        )}
      </ul>
    </Dialog>
  );
}
