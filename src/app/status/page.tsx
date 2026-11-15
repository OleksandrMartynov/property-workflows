import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { StatusBadge, StatusIcon } from "@/components/ui/status-badge";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { KYIV_TZ } from "@/lib/dates";
import { STATE_LABELS, STATE_TONES, type ComponentState } from "@/lib/status";
import { checkStatus } from "@/lib/status-probes";
import { cn } from "@/lib/utils";

// Сторінка статусу застосунку (WS11), як status-сторінки сервісів: загальний підсумок угорі, під ним кожен компонент зі
// станом. Публічна (src/lib/supabase/public-paths.ts): відкривається й тоді, коли вхід не працює. Без даних
// користувачів і без секретів — лише стани, версія збірки й час відповіді.
export const metadata: Metadata = { title: "Status" };
export const dynamic = "force-dynamic";

const BANNER: Record<ComponentState, string> = {
  operational: "border-status-done-mark/30 bg-status-done text-status-done-foreground",
  degraded: "border-status-due-soon-mark/30 bg-status-due-soon text-status-due-soon-foreground",
  outage: "border-status-overdue-mark/30 bg-status-overdue text-status-overdue-foreground",
};

const checkedAtLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: KYIV_TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(
    new Date(iso),
  );

export default async function StatusPage() {
  const report = await checkStatus();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="rounded-sm">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitch compact />
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open app
          </Link>
        </div>
      </header>

      <h1 className="sr-only">System status</h1>
      <section
        data-testid="status-overall"
        data-state={report.state}
        className={cn("animate-ui-page flex items-center gap-3 rounded-md border px-4 py-4", BANNER[report.state])}
      >
        <StatusIcon status={STATE_TONES[report.state]} className="size-6" />
        <p className="text-title">{report.title}</p>
      </section>

      <Card>
        <ul className="flex flex-col divide-y divide-border">
          {report.components.map((c) => (
            <li key={c.id} data-testid="status-component" data-component={c.id} data-state={c.state} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-medium">{c.name}</span>
                <span className="tabular text-meta text-muted-foreground break-words">{c.detail}</span>
              </div>
              <StatusBadge status={STATE_TONES[c.state]}>{STATE_LABELS[c.state]}</StatusBadge>
            </li>
          ))}
        </ul>
      </Card>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-meta text-muted-foreground">
        <span className="tabular">
          Checked <time dateTime={report.checkedAt}>{checkedAtLabel(report.checkedAt)}</time> Kyiv time
        </span>
        <Link href="/status" prefetch={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Refresh
        </Link>
      </footer>
    </main>
  );
}
