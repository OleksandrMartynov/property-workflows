import Link from "next/link";
import { SharedTitle, morphName } from "@/components/ui/motion";
import type { CSSProperties } from "react";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, rowLinkClass } from "@/components/ui/table";
import { NO_RUNS_ACTION, NO_RUNS_TITLE, runStatusLabel, runStatusTone } from "@/lib/runs/labels";
import { formatProgress } from "@/lib/runs/progress";
import { NO_RUNS_FOUND } from "@/lib/runs/views";

// Колонки з'являються за шириною самої таблиці (Table — @container), а не вікна: поруч сайдбар. Завжди — назва
// випадку й прогрес; статус — окремою колонкою з 448 px (на телефоні — під назвою, «Вигляд і тон» PM); далі виконавці
// (аватари, вузькі), менеджер, наступна задача. Пороги заміряно: на кожній ширині таблиця без прокрутки вбік.
const STATUS = "hidden @md:table-cell";
const ASSIGNEES = "hidden @xl:table-cell";
const MANAGER = "hidden @3xl:table-cell";
const NEXT_TASK = "hidden @5xl:table-cell";

export interface RunRow {
  id: string;
  case_name: string;
  template_name: string;
  status: string;
  run_manager_id: string;
}

export interface RunSummary {
  done: number;
  total: number;
  /** Назва першої невиконаної задачі за порядком секцій і позицій; null, якщо всі виконано. */
  nextTask: string | null;
  /** Унікальні email виконавців задач запуску. */
  assignees: string[];
}

/** Таблиця запусків (щільні рядки): прогрес кільцем і словами, наступна задача, виконавці, статус пілюлею зі значком. */
export function RunsList({
  runs,
  summary,
  managerOf,
  filtered = false,
}: {
  runs: RunRow[];
  summary: Record<string, RunSummary>;
  managerOf: (run: RunRow) => string;
  /** Список звужено виглядом чи пошуком: порожній результат — «No runs found.» без запуску шаблону. */
  filtered?: boolean;
}) {
  if (!runs.length && filtered) {
    return (
      <EmptyState
        title={NO_RUNS_FOUND}
        action={
          <Link href="/runs" className={buttonVariants({ variant: "outline" })}>
            Clear filters
          </Link>
        }
      />
    );
  }
  if (!runs.length) {
    return (
      <EmptyState
        title={NO_RUNS_TITLE}
        action={
          <Link href="/templates" className={buttonVariants({ variant: "default" })}>
            {NO_RUNS_ACTION}
          </Link>
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead className={MANAGER}>Run manager</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead className={NEXT_TASK}>Next task</TableHead>
          <TableHead className={ASSIGNEES}>Assignees</TableHead>
          <TableHead className={STATUS}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, index) => {
          const s = summary[run.id] ?? { done: 0, total: 0, nextTask: null, assignees: [] };
          return (
            <TableRow key={run.id} interactive data-testid="run-row" className="animate-ui-rise" style={{ "--i": index } as CSSProperties}>
              <TableCell>
                {/* wrap-anywhere: довге слово без пробілів (назва з 100 літер) рветься, а не розпирає таблицю вбік. */}
                <div className="flex min-w-40 flex-col wrap-anywhere">
                  <Link href={`/runs/${run.id}`} className={rowLinkClass}>
                    <SharedTitle name={morphName("run", run.id)}>{run.case_name}</SharedTitle>
                  </Link>
                  <span className="text-meta text-muted-foreground">{run.template_name}</span>
                  {/* Колонку менеджера сховано — email під назвою (не зникає і не обрізається); так само статус на телефоні. */}
                  <span className="text-meta text-muted-foreground @3xl:hidden">{managerOf(run)}</span>
                  <span className="mt-1 @md:hidden">
                    <StatusBadge status={runStatusTone(run.status)}>{runStatusLabel(run.status)}</StatusBadge>
                  </span>
                </div>
              </TableCell>
              <TableCell className={`${MANAGER} text-muted-foreground`}>{managerOf(run)}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <ProgressRing done={s.done} total={s.total} />
                  <span data-testid="run-progress" className="tabular whitespace-nowrap">
                    {formatProgress({ done: s.done, total: s.total })}
                  </span>
                </span>
              </TableCell>
              <TableCell className={`${NEXT_TASK} max-w-72 whitespace-normal text-muted-foreground`}>{s.nextTask ?? "—"}</TableCell>
              <TableCell className={ASSIGNEES}>
                <AvatarStack emails={s.assignees} />
              </TableCell>
              <TableCell className={STATUS}>
                <StatusBadge status={runStatusTone(run.status)}>{runStatusLabel(run.status)}</StatusBadge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
