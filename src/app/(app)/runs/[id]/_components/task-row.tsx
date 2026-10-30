import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { TaskCheck } from "@/components/ui/task-check";
import { requiredLabel } from "@/lib/runs/labels";
import { cn } from "@/lib/utils";

/**
 * Рядок задачі запуску — спільний для менеджера (run-detail) і підрядника (vendor-run-detail): позначка виконання,
 * назва й «required» / «optional» (AC-TASK-15, AC-VENDOR-04); решту комірок (виконавець, статус, дія) дає сторінка.
 */
export function TaskRow({ name, required, done, mine = false, children }: { name: string; required: boolean; done: boolean; mine?: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        "relative flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-ui first:rounded-t-md last:rounded-b-md hover:bg-state-hover",
        // Своя задача — смужка акцентного кольору зліва (не лише колір: поруч email виконавця, для скрінрідера — підпис).
        mine && "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary",
      )}
      data-testid="run-task"
      data-mine={mine || undefined}
    >
      <TaskCheck done={done} />
      <span className={done ? "min-w-0 flex-1 text-muted-foreground" : "min-w-0 flex-1"}>
        {name}
        {mine ? <span className="sr-only"> (assigned to you)</span> : null}
        <Badge variant="outline" className="ml-2 align-middle" data-testid="task-required">
          {requiredLabel(required)}
        </Badge>
      </span>
      {children}
    </li>
  );
}
