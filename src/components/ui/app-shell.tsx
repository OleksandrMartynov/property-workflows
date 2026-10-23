"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { LogOutIcon } from "./icons";
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-label focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-(--size-sidebar) shrink-0 flex-col gap-3 border-r border-sidebar-border bg-sidebar p-2 text-sidebar-foreground md:flex">
        <Link href="/" className="flex h-9 items-center rounded-sm px-2 no-underline">
          <Logo />
        </Link>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 items-center gap-2 rounded-sm border border-sidebar-border bg-card px-2 text-label text-muted-foreground transition-ui hover:bg-state-hover"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded-xs border border-border bg-muted px-1 font-sans text-[11px] leading-4 text-muted-foreground">⌘K</kbd>
        </button>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="flex h-8 items-center gap-2 rounded-sm px-2 text-label text-sidebar-foreground transition-ui hover:bg-state-hover aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground"
            >
              <NavIcon d={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-3">
          {email ? (
            <div className="flex items-start gap-2 px-2 pb-1">
              <Avatar email={email} />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span data-testid="user-email" className="break-all text-label leading-4">
                  {email}
                </span>
                {role ? (
                  <Badge data-testid="user-role" variant="outline">
                    {role}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : null}
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="w-full justify-start gap-2 text-foreground">
              <LogOutIcon className="size-4 text-muted-foreground" />
              Sign out
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} signOutAction={signOutAction} />
    </div>
  );
}

type Command = { id: string; label: string; hint: string; run: () => void };

/** Палітра ⌘K: фільтр за словом, ↑ ↓ для вибору, Enter — виконати, Esc — закрити. */
function CommandPalette({ open, onClose, signOutAction }: { open: boolean; onClose: () => void; signOutAction: () => Promise<void> }) {
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
    <Dialog open={open} onClose={close} labelledBy={`${listId}-label`} className="mt-[14vh] max-w-xl overflow-hidden">
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
