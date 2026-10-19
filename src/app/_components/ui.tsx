import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "../login/actions";

/** Каркас сторінок застосунку: навігація, роль, вихід. */
export function PageShell({ title, email, role, children }: { title: string; email?: string | null; role?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="font-semibold">
            Property workflows
          </Link>
          <Link href="/templates" className="hover:underline">
            Templates
          </Link>
          <Link href="/runs" className="hover:underline">
            Runs
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          {email ? <span data-testid="user-email">{email}</span> : null}
          {role ? <span data-testid="user-role" className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{role}</span> : null}
          <form action={signOut}>
            <button type="submit" className="hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      : "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function StatusBadge({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        done ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      }`}
    >
      {children}
    </span>
  );
}

export const buttonClass = "rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50";
export const inputClass = "rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
