import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { requireViewer } from "@/lib/supabase/viewer";
import { PageShell } from "../_components/ui";
import { RunsList } from "./_components/runs-list";
import { loadRunSummaries } from "./_lib/summaries";

export const metadata = { title: "Runs" };

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

  const { summary, emailOf } = await loadRunSummaries(
    supabase,
    (runs ?? []).map((r) => r.id),
  );
  const total = count ?? 0;
  const hasNext = from + PAGE_SIZE < total;
  const managerOf = (run: { run_manager_id: string }) => (run.run_manager_id === viewer.id ? "me" : (emailOf.get(run.run_manager_id) ?? "—"));

  return (
    <PageShell title="Runs" email={viewer.email} role={viewer.role}>
      <RunsList runs={runs ?? []} summary={summary} managerOf={managerOf} />
      {page > 1 || hasNext ? (
        <nav className="flex items-center justify-between text-body" aria-label="Pages">
          {page > 1 ? (
            <Link href={`/runs?page=${page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular text-muted-foreground">
            Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          {hasNext ? (
            <Link href={`/runs?page=${page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </PageShell>
  );
}
