import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { TaskCheck } from "@/components/ui/task-check";
import { requiredLabel } from "@/lib/runs/labels";
import { cn } from "@/lib/utils";

/**
 * Рядок задачі запуску — спільний для менеджера (run-detail) і підрядника (vendor-run-detail): позначка виконання,
 * назва й «required» / «optional» (AC-TASK-15, AC-VENDOR-04). Дворядковий: під назвою — `meta` (виконавець), праворуч —
 * статус і дія (`children`); на телефоні вони лягають під назву, і довга назва не стискається до кількох символів.
 * Поки «Mark as done» надсилається (кнопка з aria-busy), рядок приглушується й позначка пульсує — відгук одразу,
 * без JavaScript-стану (форма працює й без нього).
 */
export function TaskRow({
  name,
  required,
  done,
  mine = false,
  meta,
  children,
}: {
  name: string;
  required: boolean;
  done: boolean;
  mine?: boolean;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "group/task relative flex min-h-11 flex-wrap items-start gap-x-3 gap-y-2 px-4 py-2.5 transition-ui first:rounded-t-md last:rounded-b-md hover:bg-state-hover sm:flex-nowrap sm:items-center",
        // Своя задача — смужка акцентного кольору зліва (не лише колір: поруч email виконавця, для скрінрідера — підпис).
        mine && "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary",
      )}
      data-testid="run-task"
      data-mine={mine || undefined}
    >
      <TaskCheck done={done} className="mt-0.5 motion-safe:group-has-[[aria-busy]]/task:animate-pulse sm:mt-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 transition-ui group-has-[[aria-busy]]/task:opacity-60">
        <span className={cn("break-words", done && "text-muted-foreground")}>
          {name}
          {mine ? <span className="sr-only"> (assigned to you)</span> : null}
          <Badge variant="outline" className="ml-2 align-middle" data-testid="task-required">
            {requiredLabel(required)}
          </Badge>
        </span>
        {meta ? <span className="min-w-0 text-meta text-muted-foreground">{meta}</span> : null}
      </div>
      <div className="flex w-full items-center justify-end gap-3 pl-7 sm:w-auto sm:shrink-0 sm:pl-0">{children}</div>
    </li>
  );
}
