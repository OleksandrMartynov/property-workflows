import { redirect } from "next/navigation";
import type { requireViewer } from "@/lib/supabase/viewer";
import { ilikePattern, runViewParams, type RunView } from "@/lib/runs/views";

type Session = Awaited<ReturnType<typeof requireViewer>>;
type Filters = { view: RunView; query: string };

export const PAGE_SIZE = 50;

const COLUMNS = "id, case_name, template_name, status, run_manager_id, created_at";
type RunRow = { id: string; case_name: string; template_name: string; status: string; run_manager_id: string; created_at: string };

/**
 * Запит запусків з виглядом і пошуком. «Mine» — запуски, де в мене є задача «to do»: умова — у тому самому запиті (inner
 * join run_tasks під RLS), тож пагінація й кількість рахуються вже по відфільтрованих запусках, без окремого списку id.
 */
function runsQuery({ supabase, viewer }: Session, { view, query }: Filters) {
  let request = supabase
    .from("runs")
    .select(view === "mine" ? `${COLUMNS}, run_tasks!inner(id)` : COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");
  if (view === "in_progress" || view === "completed") request = request.eq("status", view);
  if (view === "mine") request = request.eq("run_tasks.assignee_id", viewer.id).eq("run_tasks.status", "to_do");
  if (query) request = request.ilike("case_name", ilikePattern(query));
  return request;
}

/** Сторінка списку запусків з виглядом і пошуком. Видимість — RLS (AC-TASK-06), порядок — від новіших (AC-TASK-14). */
export async function loadRunsPage(session: Session, filters: Filters & { page: number }) {
  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await runsQuery(session, filters).range(from, from + PAGE_SIZE - 1);
  if (error) {
    // Сторінка за межами результатів (?page=999): PostgREST з count=exact відповідає 416 PGRST103 — перша сторінка з
    // тими самими виглядом і пошуком.
    if (error.code === "PGRST103") {
      const keep = new URLSearchParams(runViewParams(filters.view, filters.query)).toString();
      redirect(keep ? `/runs?${keep}` : "/runs");
    }
    throw error;
  }
  // Без вкладених run_tasks (для «Mine» вони лише фільтрують).
  const runs = ((data ?? []) as unknown as RunRow[]).map(({ id, case_name, template_name, status, run_manager_id, created_at }) => ({ id, case_name, template_name, status, run_manager_id, created_at }));
  return { runs, total: count ?? 0 };
}
