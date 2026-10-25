import { Avatar } from "@/components/ui/avatar";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { CompletionGlow } from "@/components/ui/completion-glow";
import { TaskCheck } from "@/components/ui/task-check";
import { canCompleteTask } from "@/lib/runs/access";
import { isLastRequiredTask } from "@/lib/runs/confirmation";
import { requiredLabel, runStatusLabel, taskStatusLabel } from "@/lib/runs/labels";
import { countProgress, formatProgress } from "@/lib/runs/progress";
import { groupBySection } from "@/lib/runs/sections";
import type { Viewer } from "@/lib/supabase/viewer";
import { MarkDoneForm } from "../mark-done-form";

export interface RunInfo {
  id: string;
  case_name: string;
  template_name: string;
  status: string;
  run_manager_id: string;
}

export interface RunTaskRow {
  id: string;
  section_name: string;
  section_position: number;
  position: number;
  name: string;
  required: boolean;
  assignee_id: string;
  status: string;
}

/** Тіло сторінки запуску: чекліст за секціями зліва, «Details» справа. Дані читає сторінка, тут лише вигляд. */
export function RunDetail({
  run,
  tasks,
  emailOf,
  viewer,
  completeTask,
}: {
  run: RunInfo;
  tasks: RunTaskRow[];
  emailOf: Map<string, string | null>;
  viewer: Viewer;
  completeTask: (formData: FormData) => Promise<void>;
}) {
  const sections = groupBySection(tasks);
  const progress = countProgress(tasks);
  const managerEmail = emailOf.get(run.run_manager_id);
  const assignees = [...new Set(tasks.map((t) => emailOf.get(t.assignee_id)).filter((e): e is string => Boolean(e)))];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex flex-col gap-6">
        {sections.map((section) => {
          const doneInSection = section.tasks.filter((t) => t.status === "done").length;
          return (
            <section key={section.key} className="flex flex-col gap-2" data-testid="run-section" aria-labelledby={`s-${section.key}`}>
              <div className="flex items-center justify-between px-1">
                <h2 id={`s-${section.key}`} className="text-heading">
                  {section.name}
                </h2>
                <span className="tabular text-meta text-muted-foreground">
                  {doneInSection}/{section.tasks.length}
                </span>
              </div>
              <Card>
                <ul className="flex flex-col divide-y divide-border">
                  {section.tasks.map((task) => {
                    const isDone = task.status === "done";
                    const assignee = emailOf.get(task.assignee_id);
                    return (
                      <li
                        key={task.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-ui first:rounded-t-md last:rounded-b-md hover:bg-state-hover"
                        data-testid="run-task"
                      >
                        <TaskCheck done={isDone} />
                        <span className={isDone ? "min-w-0 flex-1 text-muted-foreground" : "min-w-0 flex-1"}>
                          {task.name}
                          <Badge variant="outline" className="ml-2 align-middle" data-testid="task-required">
                            {requiredLabel(task.required)}
                          </Badge>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-label font-normal text-muted-foreground">
                          {assignee ? <Avatar email={assignee} /> : null}
                          {assignee ?? "—"}
                        </span>
                        <StatusBadge status={isDone ? "done" : "todo"}>{taskStatusLabel(task.status)}</StatusBadge>
                        {canCompleteTask(viewer, task, run) ? (
                          <MarkDoneForm
                            action={completeTask}
                            runId={run.id}
                            taskId={task.id}
                            taskName={task.name}
                            needsConfirmation={isLastRequiredTask(task, tasks)}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          );
        })}
      </div>

      <CompletionGlow complete={run.status === "completed"} burst burstOrigin="left-8 top-[3.6rem]" className="lg:sticky lg:top-6">
      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-heading">Details</h2>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <ProgressRing done={progress.done} total={progress.total} className="size-6" />
            <span data-testid="run-progress" className="tabular text-heading">
              {formatProgress(progress)}
            </span>
          </div>
          <ProgressBar done={progress.done} total={progress.total} />
        </div>
        <dl className="flex flex-col text-body [&>dd]:mb-3.5 [&>dd:last-child]:mb-0">
          <dt className="mb-1 text-meta text-muted-foreground">Template</dt>
          <dd className="min-w-0 break-words">{run.template_name}</dd>
          <dt className="mb-1 text-meta text-muted-foreground">Run manager</dt>
          <dd data-testid="run-manager" className="inline-flex min-w-0 items-center gap-1.5" title={managerEmail ?? undefined}>
            {managerEmail ? <Avatar email={managerEmail} /> : null}
            <span className="min-w-0 break-words">{managerEmail ?? "—"}</span>
          </dd>
          <dt className="mb-1 text-meta text-muted-foreground">Status</dt>
          <dd data-testid="run-status">{runStatusLabel(run.status)}</dd>
          <dt className="mb-1 text-meta text-muted-foreground">Assignees</dt>
          <dd>
            <AvatarStack emails={assignees} max={4} />
          </dd>
        </dl>
      </Card>
      </CompletionGlow>
    </div>
  );
}

