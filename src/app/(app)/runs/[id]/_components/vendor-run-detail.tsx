import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { canCompleteTask } from "@/lib/runs/access";
import { countProgress, formatVendorProgress } from "@/lib/runs/progress";
import { groupBySection } from "@/lib/runs/sections";
import type { Viewer } from "@/lib/supabase/viewer";
import type { RunTaskRow } from "./run-detail";
import { TaskActions } from "./task-actions";
import { TaskRow } from "./task-row";

/**
 * Запуск очима підрядника (AC-VENDOR-04, AC-VENDOR-05): лише його задачі (база не віддає інших) — назва, секція,
 * «required» / «optional», статус і «Mark as done»; над ними «Your tasks: N of K done». Без email інших користувачів,
 * менеджера, шаблону, версії й прогресу всього запуску. Підтвердження — для задачі, яку база назвала останньою
 * обов'язковою задачею запуску (run_last_required_task), як і для інших ролей.
 */
export function VendorRunDetail({
  run,
  tasks,
  lastRequiredTaskId,
  viewer,
  completeTask,
}: {
  run: { id: string; status: string };
  tasks: RunTaskRow[];
  lastRequiredTaskId: string | null;
  viewer: Viewer;
  completeTask: (formData: FormData) => Promise<void>;
}) {
  const sections = groupBySection(tasks);
  const progress = countProgress(tasks);
  // Підрядник ніколи не менеджер запуску: позначка — лише своєї задачі «to do» в запуску «in progress».
  const runForAccess = { run_manager_id: "", status: run.status };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <ProgressRing done={progress.done} total={progress.total} className="size-6" />
        <span data-testid="vendor-progress" className="tabular text-heading">
          {formatVendorProgress(progress)}
        </span>
      </div>
      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-2" data-testid="run-section" aria-labelledby={`s-${section.key}`}>
          <h2 id={`s-${section.key}`} className="px-1 text-heading">
            {section.name}
          </h2>
          <Card>
            <ul className="flex flex-col divide-y divide-border">
              {section.tasks.map((task) => {
                return (
                  <TaskRow
                    key={task.id}
                    name={task.name}
                    required={task.required}
                    done={task.status === "done"}
                  >
                    <TaskActions
                      runId={run.id}
                      task={task}
                      canEdit={canCompleteTask(viewer, task, runForAccess)}
                      needsConfirmation={task.id === lastRequiredTaskId}
                      completeTask={completeTask}
                    />
                  </TaskRow>
                );
              })}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
