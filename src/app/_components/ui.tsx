import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { AppShell } from "@/components/ui/app-shell";
import { signOut } from "../login/actions";

/** Каркас сторінок застосунку: сайдбар, роль, вихід, заголовок сторінки. */
export function PageShell({
  title,
  description,
  email,
  role,
  actions,
  back,
  children,
}: {
  title: string;
  description?: ReactNode;
  email?: string | null;
  role?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <AppShell email={email} role={role} signOutAction={signOut}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {back ? (
            <Link href={back.href} className="inline-flex w-fit items-center gap-1 text-label text-muted-foreground no-underline transition-ui hover:text-foreground">
              <span aria-hidden="true">←</span> {back.label}
            </Link>
          ) : null}
          <h1 className="text-title">{title}</h1>
          {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </AppShell>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return <Alert variant={kind}>{children}</Alert>;
}
