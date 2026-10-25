import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { runStatusLabel } from "@/lib/runs/labels";
import { errorMessage } from "@/lib/runs/messages";
import { requireViewer } from "@/lib/supabase/viewer";
import { Notice, PageShell } from "@/app/_components/ui";
import { completeTask } from "../actions";
import { RunDetail } from "./_components/run-detail";

// Сторінка запуску: AC-RUN-02, AC-RUN-12 (задачі й секції — копія на момент запуску), AC-RUN-04…09 (менеджер запуску й
// виконавці), AC-TASK-05 (прогрес «N of M done»), AC-TASK-08 (статус кожної задачі), AC-TASK-01…03, 07, 18 (позначка
// виконаною лише на дозволених задачах), AC-TASK-11 (email виконавця), AC-TASK-12 (групи за секціями), AC-TASK-15
// («required» / «optional»). Чужий запуск RLS не віддає — notFound() і «Run not found» (AC-TASK-10, not-found.tsx).
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const [{ id }, { error, done }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();

  const { data: run } = await supabase
    .from("runs")
    .select("id, case_name, template_name, template_version, status, run_manager_id, created_at")
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
  const message = errorMessage(error);

  return (
    <PageShell
      title={run.case_name}
      description={run.template_name}
      back={{ href: "/runs", label: "Runs" }}
      actions={<StatusBadge status={run.status === "completed" ? "done" : "progress"}>{runStatusLabel(run.status)}</StatusBadge>}
    >
      {done === "launched" ? <Notice kind="success">Run launched.</Notice> : null}
      {message ? <Notice kind="error">{message}</Notice> : null}
      <RunDetail run={run} tasks={tasks ?? []} emailOf={emailOf} viewer={viewer} completeTask={completeTask} />
    </PageShell>
  );
}
