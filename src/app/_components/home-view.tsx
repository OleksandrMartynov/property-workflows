import Link from "next/link";
import type { CSSProperties } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { StatusIcon } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { RunsList, type RunRow, type RunSummary } from "@/app/(app)/runs/_components/runs-list";

/** Моя відкрита задача для блоку «Your tasks»: назва, запуск, до якого вона належить. */
export interface MyTask {
  id: string;
  name: string;
  run_id: string;
  run_name: string;
}

function Stat({ href, label, value, accent = false }: { href: string; label: string; value: number; accent?: boolean }) {
  return (
    <Link href={href} className="group block rounded-md no-underline">
      {/* Акцент — лише там, де чекають на мене (є мої задачі «to do»): смужка й число кольору primary (пара primary → card). */}
      <Card
        className={cn(
          "relative flex h-full flex-col gap-1 overflow-hidden p-4 transition-ui group-hover:border-border-strong group-hover:shadow-md",
          accent && "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary",
        )}
        data-accent={accent || undefined}
      >
        <span className="text-label text-muted-foreground">{label}</span>
        <span className={cn("tabular text-display", accent && "text-primary")}>
          <span className="sr-only">{value}</span>
          <span aria-hidden="true" className="count-up" style={{ "--count": value } as CSSProperties} />
        </span>
      </Card>
    </Link>
  );
}

/** Перші мої задачі «to do» — одним кліком до запуску; повний перелік — «View all» (вигляд «mine» списку запусків). */
function MyTasks({ tasks, total }: { tasks: MyTask[]; total: number }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="my-tasks">
      <div className="flex items-center justify-between">
        <h2 id="my-tasks" className="text-heading">
          Your tasks
        </h2>
        {total > tasks.length ? (
          <Link href="/runs?view=mine" className={buttonVariants({ variant: "link" })}>
            View all
          </Link>
        ) : null}
      </div>
      <Card>
        <ul className="flex flex-col divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} data-testid="my-task">
              <Link
                href={`/runs/${task.run_id}`}
                className="group flex min-h-11 items-center gap-3 px-4 py-2.5 text-foreground no-underline transition-ui first:rounded-t-md last:rounded-b-md hover:bg-state-hover"
              >
                <StatusIcon status="todo" className="size-4" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="break-words">{task.name}</span>
                  <span className="break-words text-meta text-muted-foreground">{task.run_name}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-ui group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/** Тіло головної: лічильники, мої задачі й останні запуски. Дані читає сторінка, тут лише вигляд. */
export function HomeView({
  active,
  mine,
  completed,
  myTasks = [],
  runs,
  summary,
  managerOf,
}: {
  active: number;
  mine: number;
  myTasks?: MyTask[];
  completed: number;
  runs: RunRow[];
  summary: Record<string, RunSummary>;
  managerOf: (run: RunRow) => string;
}) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-3">
        <li>
          <Stat href="/runs?view=in_progress" label="Active runs" value={active} />
        </li>
        <li>
          <Stat href="/runs?view=mine" label="Your open tasks" value={mine} accent={mine > 0} />
        </li>
        <li>
          <Stat href="/runs?view=completed" label="Completed runs" value={completed} />
        </li>
      </ul>
      {myTasks.length ? <MyTasks tasks={myTasks} total={mine} /> : null}
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
