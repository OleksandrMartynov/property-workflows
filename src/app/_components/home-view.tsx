import Link from "next/link";
import type { CSSProperties } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RunsList, type RunRow, type RunSummary } from "@/app/(app)/runs/_components/runs-list";

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="group block rounded-md no-underline">
      <Card className="flex h-full flex-col gap-1 p-4 transition-ui group-hover:border-border-strong group-hover:shadow-md">
        <span className="text-label text-muted-foreground">{label}</span>
        <span className="tabular text-display">
          <span className="sr-only">{value}</span>
          <span aria-hidden="true" className="count-up" style={{ "--count": value } as CSSProperties} />
        </span>
      </Card>
    </Link>
  );
}

/** Тіло головної: лічильники й останні запуски. Дані читає сторінка, тут лише вигляд. */
export function HomeView({
  active,
  mine,
  completed,
  runs,
  summary,
  managerOf,
}: {
  active: number;
  mine: number;
  completed: number;
  runs: RunRow[];
  summary: Record<string, RunSummary>;
  managerOf: (run: RunRow) => string;
}) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-3">
        <li>
          <Stat href="/runs" label="Active runs" value={active} />
        </li>
        <li>
          <Stat href="/runs" label="Your open tasks" value={mine} />
        </li>
        <li>
          <Stat href="/runs" label="Completed runs" value={completed} />
        </li>
      </ul>
      <section className="flex flex-col gap-3" aria-labelledby="recent-runs">
        <div className="flex items-center justify-between">
          <h2 id="recent-runs" className="text-heading">
            Recent runs
          </h2>
          <Link href="/runs" className={buttonVariants({ variant: "link" })}>
            View all
          </Link>
        </div>
        <RunsList runs={runs} summary={summary} managerOf={managerOf} />
      </section>
    </>
  );
}
