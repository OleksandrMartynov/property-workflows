import Link from "next/link";
import type { CSSProperties } from "react";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, rowLinkClass } from "@/components/ui/table";
import { runStatusLabel } from "@/lib/runs/labels";
import { formatProgress } from "@/lib/runs/progress";

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
export function RunsList({ runs, summary, managerOf }: { runs: RunRow[]; summary: Record<string, RunSummary>; managerOf: (run: RunRow) => string }) {
  if (!runs.length) {
    return (
      <EmptyState
        title="No runs yet."
        action={
          <Link href="/templates" className={buttonVariants({ variant: "default" })}>
            Launch a template
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
          <TableHead>Run manager</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Next task</TableHead>
          <TableHead>Assignees</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, index) => {
          const s = summary[run.id] ?? { done: 0, total: 0, nextTask: null, assignees: [] };
          return (
            <TableRow key={run.id} interactive data-testid="run-row" className="animate-ui-rise" style={{ "--i": index } as CSSProperties}>
              <TableCell>
                <div className="flex flex-col">
                  <Link href={`/runs/${run.id}`} className={rowLinkClass}>
                    {run.case_name}
                  </Link>
                  <span className="text-meta text-muted-foreground">{run.template_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{managerOf(run)}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <ProgressRing done={s.done} total={s.total} />
                  <span data-testid="run-progress" className="tabular whitespace-nowrap">
                    {formatProgress({ done: s.done, total: s.total })}
                  </span>
                </span>
              </TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground">{s.nextTask ?? "—"}</TableCell>
              <TableCell>
                <AvatarStack emails={s.assignees} />
              </TableCell>
              <TableCell>
                <StatusBadge status={run.status === "completed" ? "done" : "progress"}>{runStatusLabel(run.status)}</StatusBadge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
