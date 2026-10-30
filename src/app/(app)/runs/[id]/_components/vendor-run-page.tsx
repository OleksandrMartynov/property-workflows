import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { runStatusLabel, runStatusTone } from "@/lib/runs/labels";
import type { requireViewer } from "@/lib/supabase/viewer";
import { Notice, PageShell } from "@/app/_components/ui";
import { completeTask } from "../../actions";
import { VendorRunDetail } from "./vendor-run-detail";

type ViewerSession = Awaited<ReturnType<typeof requireViewer>>;

/**
 * Сторінка запуску для підрядника (AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06): лише його задачі (RLS run_tasks), назва
 * випадку й статус — із vendor_runs (рядка runs із шаблоном і версією база йому не віддає); запуск без його задач —
 * 0 рядків → notFound() і «Run not found».
 */
export async function VendorRunPage({ id, message, supabase, viewer }: { id: string; message?: string | null } & ViewerSession) {
  const [{ data: mine }, { data: tasks }, { data: lastRequired }] = await Promise.all([
    supabase.rpc("vendor_runs", { p_run_id: id }),
    supabase
      .from("run_tasks")
      .select("id, section_name, section_position, position, name, required, assignee_id, status")
      .eq("run_id", id)
      .order("section_position")
      .order("position"),
    supabase.rpc("run_last_required_task", { p_run_id: id }),
  ]);
  const run = mine?.[0];
  if (!run) notFound();

  return (
    <PageShell
      title={run.case_name}
      back={{ href: "/runs", label: "Runs" }}
      actions={<StatusBadge status={runStatusTone(run.status)}>{runStatusLabel(run.status)}</StatusBadge>}
    >
      {message ? <Notice kind="error">{message}</Notice> : null}
      <VendorRunDetail run={run} tasks={tasks ?? []} lastRequiredTaskId={lastRequired ?? null} viewer={viewer} completeTask={completeTask} />
    </PageShell>
  );
}
