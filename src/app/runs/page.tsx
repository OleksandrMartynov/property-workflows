import Link from "next/link";
import { runStatusLabel } from "@/lib/runs/labels";
import { formatProgress, progressByRun } from "@/lib/runs/progress";
import { requireViewer } from "@/lib/supabase/viewer";
import { PageShell, StatusBadge } from "../_components/ui";

// Список запусків: AC-TASK-06 — менеджер бачить лише запуски, де він менеджер запуску або виконавець хоча б однієї
// задачі (RLS, private.can_see_run), адміністратор — усі; AC-TASK-09 — прогрес «N of M done» кожного запуску.
export default async function RunsPage() {
  const { supabase, viewer } = await requireViewer();

  const { data: runs } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, run_manager_id, created_at")
    .order("created_at", { ascending: false });
  const runIds = (runs ?? []).map((r) => r.id);
  const [{ data: tasks }, { data: users }] = await Promise.all([
    runIds.length
      ? supabase.from("run_tasks").select("run_id, status").in("run_id", runIds)
      : Promise.resolve({ data: [] as { run_id: string; status: string }[] }),
    supabase.rpc("list_assignable_users"),
  ]);
  const progress = progressByRun(tasks ?? []);
  const emailOf = new Map((users ?? []).map((u) => [u.id, u.email]));

  return (
    <PageShell title="Runs" email={viewer.email} role={viewer.role}>
      {!runs?.length ? (
        <p className="text-sm text-zinc-500">
          No runs yet. <Link href="/templates" className="underline">Launch a template</Link>.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {runs.map((run) => (
            <li key={run.id} data-testid="run-row">
              <Link
                href={`/runs/${run.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800"
              >
                <span>
                  <span className="block font-medium">{run.case_name}</span>
                  <span className="block text-sm text-zinc-500">
                    {run.template_name} · run manager {run.run_manager_id === viewer.id ? "me" : (emailOf.get(run.run_manager_id) ?? "—")}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span data-testid="run-progress" className="font-medium">
                    {formatProgress(progress.get(run.id) ?? { done: 0, total: 0 })}
                  </span>
                  <StatusBadge done={run.status === "completed"}>{runStatusLabel(run.status)}</StatusBadge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
