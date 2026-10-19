import Link from "next/link";
import { redirect } from "next/navigation";
import { runStatusLabel } from "@/lib/runs/labels";
import { formatProgress } from "@/lib/runs/progress";
import { requireViewer } from "@/lib/supabase/viewer";
import { PageShell, StatusBadge } from "../_components/ui";

// Список запусків: AC-TASK-06 — менеджер бачить лише запуски, де він менеджер запуску або виконавець хоча б однієї
// задачі (RLS, private.can_see_run), адміністратор — усі; AC-TASK-09 — прогрес «N of M done» кожного запуску
// (рахує база: view run_progress). Сторінками по PAGE_SIZE, від новіших до старіших.
const PAGE_SIZE = 50;

export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof rawPage === "string" ? rawPage : "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const { supabase, viewer } = await requireViewer();

  const { data: runs, error: runsError, count } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, run_manager_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, from + PAGE_SIZE - 1);
  if (runsError) {
    // Сторінка за межами результатів (?page=999): PostgREST з count=exact відповідає 416 PGRST103.
    if (runsError.code === "PGRST103") redirect("/runs");
    throw runsError;
  }

  const runIds = (runs ?? []).map((r) => r.id);
  const [progressResult, usersResult] = await Promise.all([
    runIds.length
      ? supabase.from("run_progress").select("run_id, done, total").in("run_id", runIds)
      : Promise.resolve({ data: [] as { run_id: string; done: number; total: number }[], error: null }),
    supabase.rpc("list_assignable_users"),
  ]);
  if (progressResult.error) throw progressResult.error;
  if (usersResult.error) throw usersResult.error;

  const progress = new Map((progressResult.data ?? []).map((p) => [p.run_id, { done: p.done ?? 0, total: p.total ?? 0 }]));
  const emailOf = new Map((usersResult.data ?? []).map((u) => [u.id, u.email]));
  const total = count ?? 0;
  const hasNext = from + PAGE_SIZE < total;

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
      {page > 1 || hasNext ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link href={`/runs?page=${page - 1}`} className="underline">Newer</Link> : <span />}
          <span className="text-zinc-500">
            Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          {hasNext ? <Link href={`/runs?page=${page + 1}`} className="underline">Older</Link> : <span />}
        </nav>
      ) : null}
    </PageShell>
  );
}
