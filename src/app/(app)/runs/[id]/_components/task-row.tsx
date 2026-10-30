import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { TaskCheck } from "@/components/ui/task-check";
import { requiredLabel } from "@/lib/runs/labels";

/**
 * Рядок задачі запуску — спільний для менеджера (run-detail) і підрядника (vendor-run-detail): позначка виконання,
 * назва й «required» / «optional» (AC-TASK-15, AC-VENDOR-04); решту комірок (виконавець, статус, дія) дає сторінка.
 */
export function TaskRow({ name, required, done, children }: { name: string; required: boolean; done: boolean; children: ReactNode }) {
  return (
    <li
      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-ui first:rounded-t-md last:rounded-b-md hover:bg-state-hover"
      data-testid="run-task"
    >
      <TaskCheck done={done} />
      <span className={done ? "min-w-0 flex-1 text-muted-foreground" : "min-w-0 flex-1"}>
        {name}
        <Badge variant="outline" className="ml-2 align-middle" data-testid="task-required">
          {requiredLabel(required)}
        </Badge>
      </span>
      {children}
    </li>
  );
}
