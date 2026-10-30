import Link from "next/link";
import type { CSSProperties } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, rowLinkClass } from "@/components/ui/table";
import { NO_VENDOR_TASKS, runStatusLabel, runStatusTone } from "@/lib/runs/labels";
import { formatVendorProgress } from "@/lib/runs/progress";

export interface VendorRun {
  id: string;
  case_name: string;
  status: string;
  done: number;
  total: number;
}

/**
 * Список запусків підрядника (AC-VENDOR-03): лише запуски з його задачами — назва випадку, статус запуску й «Your tasks:
 * N of K done» (лише його задачі); без менеджера, шаблону, наступної задачі й email інших (Q11 — лише поля PM).
 * Без задач — «No tasks assigned to you yet.» без таблиці (AC-VENDOR-10).
 */
export function VendorRunsList({ runs }: { runs: VendorRun[] }) {
  if (!runs.length) return <EmptyState title={NO_VENDOR_TASKS} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Your tasks</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, index) => (
          <TableRow key={run.id} interactive data-testid="run-row" className="animate-ui-rise" style={{ "--i": index } as CSSProperties}>
            <TableCell>
              <Link href={`/runs/${run.id}`} className={rowLinkClass}>
                {run.case_name}
              </Link>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-2">
                <ProgressRing done={run.done} total={run.total} />
                <span data-testid="vendor-progress" className="tabular whitespace-nowrap">
                  {formatVendorProgress(run)}
                </span>
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge status={runStatusTone(run.status)}>{runStatusLabel(run.status)}</StatusBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
