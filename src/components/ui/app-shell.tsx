"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { ChevronsUpDownIcon, LogOutIcon, PanelLeftIcon, SearchIcon } from "./icons";
import { Popover } from "./popover";
import { ThemeSwitch, chooseTheme } from "./theme-switch";
import { THEME_CHOICES, THEME_LABELS } from "@/lib/theme";
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

/** Підрядник (vendor) працює лише зі своїми задачами: у навігації — лише Runs (шаблонів і головної агенції не бачить). */
export const navFor = (role?: string) => (role === "vendor" ? NAV.filter((item) => item.href === "/runs") : NAV);

/** Команди переходу в ⌘K — ті самі сторінки, що й навігація; «Launch a template» — лише тим, хто запускає шаблони. */
export const navigationCommands = (role?: string) => [
  ...navFor(role).map((item) => ({ id: item.href === "/" ? "home" : item.href.slice(1), label: `Go to ${item.label}`, href: item.href })),
  ...(role === "vendor" ? [] : [{ id: "launch", label: "Launch a template", href: "/templates" }]),
];

/** Число моїх відкритих задач біля «Runs»: нуль — нічого не показуємо; для скрінрідера — повний підпис. */
function NavBadge({ count, collapsed }: { count: number; collapsed: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      data-testid="open-tasks"
      className={cn(
        "tabular ml-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-meta font-medium text-primary-foreground",
        collapsed && "absolute right-1 top-1 ml-0 h-3.5 min-w-3.5 px-0.5 text-[10px]",
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> open tasks assigned to you</span>
    </span>
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
function AccountMenu({
  email,
  role,
  collapsed,
  compact = false,
  signOutAction,
}: {
  email: string;
  role?: string;
  collapsed: boolean;
  /** Мобільна смуга: кнопка — лише аватар, а «Sign out» — у вікні (місця в смузі немає). */
  compact?: boolean;
  signOutAction?: () => Promise<void>;
}) {
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

  // Компактне меню (мобільна смуга) рендериться в document.body: фокус — одразу на першу дію у вікні, щоб Tab не
  // проходив через сторінку.
  useEffect(() => {
    if (!open || !compact) return;
    document.getElementById(`${id}-account`)?.querySelector<HTMLElement>("button, [href], input")?.focus();
  }, [open, compact, id]);

  return (
    <>
      {compact ? (
        <button
          ref={anchor}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-account`}
          aria-label="Account"
          onClick={() => setOpen((value) => !value)}
          className="flex size-8 items-center justify-center rounded-full transition-ui hover:bg-state-hover aria-expanded:bg-state-hover"
        >
          <Avatar email={email} />
        </button>
      ) : (
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
      )}
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
          <div className="border-t border-border pt-3">
            <ThemeSwitch />
          </div>
          {signOutAction ? (
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full justify-start gap-2 text-foreground">
                <LogOutIcon className="size-4 shrink-0 text-muted-foreground" />
                Sign out
              </Button>
            </form>
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
  search,
  openTasks = 0,
  children,
}: {
  email?: string | null;
  role?: string;
  signOutAction: () => Promise<void>;
  /** Пошук запусків і шаблонів у ⌘K (серверна дія застосунку). */
  search?: PaletteSearch;
  /** Нагадування в застосунку замість листів: скільки моїх задач «to do» — число біля «Runs». */
  openTasks?: number;
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
      // «[» згортає й розгортає панель, «/» відкриває пошук — але не під час набору тексту.
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !typing) {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
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
          {navFor(role).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              data-tip={item.label}
              className="rail-tip relative flex h-8 items-center gap-2 rounded-sm px-2 text-label text-sidebar-foreground transition-ui hover:bg-state-hover aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground group-data-[collapsed=true]/side:justify-center"
            >
              <NavIcon d={item.icon} />
              <span className={collapsed ? "sr-only" : "flex-1"}>{item.label}</span>
              {item.href === "/runs" ? <NavBadge count={openTasks} collapsed={collapsed} /> : null}
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
            {navFor(role).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="flex h-7 items-center rounded-sm px-2 text-label text-muted-foreground transition-ui aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
              >
                {item.label}
                {item.href === "/runs" ? <NavBadge count={openTasks} collapsed={false} /> : null}
              </Link>
            ))}
          </nav>
          {/* Пошук і акаунт (email, роль, тема, «Sign out») — і на телефоні, як у бічній панелі. */}
          <Button type="button" variant="ghost" size="icon" aria-label="Search" onClick={() => setPaletteOpen(true)} className="text-muted-foreground">
            <SearchIcon className="size-4" />
          </Button>
          {email ? (
            <AccountMenu email={email} role={role} collapsed={false} compact signOutAction={signOutAction} />
          ) : (
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm" className="gap-1.5 text-foreground">
                <LogOutIcon className="size-3.5 text-muted-foreground" />
                Sign out
              </Button>
            </form>
          )}
        </header>
        <main id="content" tabIndex={-1} className="animate-ui-page mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} signOutAction={signOutAction} onToggleSidebar={toggleSidebar} collapsed={collapsed} role={role} search={search} />
    </div>
  );
}

type Command = { id: string; label: string; hint: string; run: () => void };

/** Результат пошуку в ⌘K (запуск чи шаблон), який дає застосунок (серверна дія під RLS того, хто шукає). */
export type PaletteHit = { id: string; label: string; detail: string; href: string; group: string };
export type PaletteSearch = (query: string) => Promise<PaletteHit[]>;

/** Пошук із затримкою 200 мс; лише від 2 символів; застарілі відповіді відкидаються. */
function usePaletteSearch(search: PaletteSearch | undefined, query: string) {
  const [hits, setHits] = useState<PaletteHit[]>([]);
  useEffect(() => {
    if (!search || query.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      search(query).then(
        (found) => alive && setHits(found),
        () => alive && setHits([]),
      );
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, query]);
  return search && query.length >= 2 ? hits : [];
}

/** Палітра ⌘K: фільтр за словом, ↑ ↓ для вибору, Enter — виконати, Esc — закрити. */
function CommandPalette({
  open,
  onClose,
  signOutAction,
  onToggleSidebar,
  collapsed,
  role,
  search,
}: {
  open: boolean;
  onClose: () => void;
  signOutAction: () => Promise<void>;
  onToggleSidebar: () => void;
  collapsed: boolean;
  role?: string;
  search?: PaletteSearch;
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const go = (href: string) => () => router.push(href);
  const commands: Command[] = [
    ...navigationCommands(role).map((c): Command => ({ id: c.id, label: c.label, hint: c.id === "launch" ? "Action" : "Navigate", run: go(c.href) })),
    { id: "sidebar", label: collapsed ? "Expand sidebar" : "Collapse sidebar", hint: "[", run: onToggleSidebar },
    ...THEME_CHOICES.map((choice): Command => ({
      id: `theme-${choice}`,
      label: `Theme: ${THEME_LABELS[choice]}`,
      hint: "Appearance",
      run: () => chooseTheme(choice),
    })),
    { id: "signout", label: "Sign out", hint: "Account", run: () => void signOutAction() },
  ];
  const needle = query.trim().toLowerCase();
  const hits = usePaletteSearch(search, needle);
  const shown = [
    ...(needle ? commands.filter((c) => c.label.toLowerCase().includes(needle)) : commands),
    ...hits.map((hit): Command => ({ id: `hit-${hit.group}-${hit.id}`, label: hit.label, hint: `${hit.group} · ${hit.detail}`, run: go(hit.href) })),
  ];
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
    <Dialog open={open} onClose={close} closable={false} size="lg" labelledBy={`${listId}-label`} className="overflow-hidden sm:mt-[14vh]">
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
          aria-label="Search commands, runs and templates"
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
