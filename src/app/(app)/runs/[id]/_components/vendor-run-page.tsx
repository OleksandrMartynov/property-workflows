import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { runStatusLabel, runStatusTone } from "@/lib/runs/labels";
import type { requireViewer } from "@/lib/supabase/viewer";
import { isUuid } from "@/lib/templates/current";
import { PageShell } from "@/app/_components/ui";
import { FlashNotice } from "@/components/ui/flash-notice";
import { DoneTaskNotice } from "./done-task-notice";
import { completeTask } from "../../actions";
import { VendorRunDetail } from "./vendor-run-detail";

type ViewerSession = Awaited<ReturnType<typeof requireViewer>>;

/**
 * Сторінка запуску для підрядника (AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06): лише його задачі (RLS run_tasks), назва
 * випадку й статус — із vendor_runs (рядка runs із шаблоном і версією база йому не віддає); запуск без його задач —
 * 0 рядків → notFound() і «Run not found».
 */
export async function VendorRunPage({
  id,
  message,
  doneTaskId,
  supabase,
  viewer,
}: { id: string; message?: string | null; doneTaskId?: string | null } & ViewerSession) {
  // Адреса не uuid — такого запуску немає (без звернення до бази); збій бази — помилка, а не «Run not found».
  if (!isUuid(id)) notFound();
  const [mine, taskRows, last] = await Promise.all([
    supabase.rpc("vendor_runs", { p_run_id: id }),
    supabase
      .from("run_tasks")
      .select("id, section_name, section_position, position, name, required, assignee_id, status")
      .eq("run_id", id)
      .order("section_position")
      .order("position"),
    supabase.rpc("run_last_required_task", { p_run_id: id }),
  ]);
  const failed = [mine, taskRows, last].find((result) => result.error);
  if (failed?.error) throw failed.error;
  const run = mine.data?.[0];
  const tasks = taskRows.data;
  const lastRequired = last.data;
  if (!run) notFound();

  return (
    <PageShell
      title={run.case_name}
      back={{ href: "/runs", label: "Runs" }}
      actions={<StatusBadge status={runStatusTone(run.status)}>{runStatusLabel(run.status)}</StatusBadge>}
    >
      <DoneTaskNotice tasks={tasks ?? []} done={doneTaskId ? "task" : undefined} task={doneTaskId ?? undefined} />
      {message ? (
        <FlashNotice kind="error" clear={["error"]}>
          {message}
        </FlashNotice>
      ) : null}
      <VendorRunDetail run={run} tasks={tasks ?? []} lastRequiredTaskId={lastRequired ?? null} viewer={viewer} completeTask={completeTask} />
    </PageShell>
  );
}
