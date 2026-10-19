import { notFound } from "next/navigation";
import { canCompleteTask } from "@/lib/runs/access";
import { runStatusLabel, taskStatusLabel } from "@/lib/runs/labels";
import { errorMessage } from "@/lib/runs/messages";
import { countProgress, formatProgress } from "@/lib/runs/progress";
import { requireViewer } from "@/lib/supabase/viewer";
import { Notice, PageShell, StatusBadge } from "../../_components/ui";
import { completeTask } from "../actions";

// Сторінка запуску: AC-RUN-02 (задачі запуску — копія на момент запуску), AC-RUN-04…09 (менеджер запуску й виконавці),
// AC-TASK-05 (прогрес «N of M done»), AC-TASK-08 (статус кожної задачі), AC-TASK-01…03, 07 (позначка виконаною).
// Чужий запуск RLS не віддає — 404 (робоче припущення Q2).
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const [{ id }, { error, done }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();

  const { data: run } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, run_manager_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!run) notFound();

  const [{ data: tasks }, { data: users }] = await Promise.all([
    supabase
      .from("run_tasks")
      .select("id, section_name, section_position, position, name, required, assignee_id, status")
      .eq("run_id", id)
      .order("section_position")
      .order("position"),
    supabase.rpc("list_assignable_users"),
  ]);
  const emailOf = new Map((users ?? []).map((u) => [u.id, u.email]));
  const sections = [...new Set((tasks ?? []).map((t) => t.section_name))];
  const message = errorMessage(error);

  return (
    <PageShell title={run.case_name} email={viewer.email} role={viewer.role}>
      {done === "launched" ? <Notice kind="success">Run launched.</Notice> : null}
      {message ? <Notice kind="error">{message}</Notice> : null}

      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Template</dt>
        <dd>{run.template_name}</dd>
        <dt className="text-zinc-500">Run manager</dt>
        <dd data-testid="run-manager">{emailOf.get(run.run_manager_id) ?? "—"}</dd>
        <dt className="text-zinc-500">Status</dt>
        <dd data-testid="run-status">{runStatusLabel(run.status)}</dd>
        <dt className="text-zinc-500">Progress</dt>
        <dd data-testid="run-progress" className="font-medium">
          {formatProgress(countProgress(tasks ?? []))}
        </dd>
      </dl>

      {sections.map((section) => (
        <section key={section} className="flex flex-col gap-2">
          <h2 className="font-medium">{section}</h2>
          <ul className="flex flex-col divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {(tasks ?? [])
              .filter((t) => t.section_name === section)
              .map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm" data-testid="run-task">
                  <span>
                    {task.name}
                    <span className="ml-2 text-xs text-zinc-500">{task.required ? "required" : "optional"}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-zinc-500">{emailOf.get(task.assignee_id) ?? "—"}</span>
                    <StatusBadge done={task.status === "done"}>{taskStatusLabel(task.status)}</StatusBadge>
                    {canCompleteTask(viewer, task, run) ? (
                      <form action={completeTask}>
                        <input type="hidden" name="run_id" value={run.id} />
                        <input type="hidden" name="task_id" value={task.id} />
                        <button type="submit" className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                          Mark as done
                        </button>
                      </form>
                    ) : null}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
