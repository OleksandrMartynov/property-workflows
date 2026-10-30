import { redirect } from "next/navigation";
import type { requireViewer } from "@/lib/supabase/viewer";
import { ilikePattern, type RunView } from "@/lib/runs/views";

type Session = Awaited<ReturnType<typeof requireViewer>>;

export const PAGE_SIZE = 50;

/**
 * Сторінка списку запусків з виглядом і пошуком. Видимість — RLS (AC-TASK-06), порядок — від новіших (AC-TASK-14).
 * «Mine» — запуски, де в мене є задача «to do»: умова — у тому самому запиті (inner join run_tasks під RLS), тож
 * пагінація й кількість рахуються вже по відфільтрованих запусках, без окремого списку id.
 */
export async function loadRunsPage({ supabase, viewer }: Session, { view, query, page }: { view: RunView; query: string; page: number }) {
  const from = (page - 1) * PAGE_SIZE;
  const columns = "id, case_name, template_name, status, run_manager_id, created_at";
  let request = supabase
    .from("runs")
    .select(view === "mine" ? `${columns}, run_tasks!inner(id)` : columns, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");

  if (view === "in_progress" || view === "completed") request = request.eq("status", view);
  if (view === "mine") request = request.eq("run_tasks.assignee_id", viewer.id).eq("run_tasks.status", "to_do");
  if (query) request = request.ilike("case_name", ilikePattern(query));

  const { data, error, count } = await request.range(from, from + PAGE_SIZE - 1);
  if (error) {
    // Сторінка за межами результатів (?page=999): PostgREST з count=exact відповідає 416 PGRST103.
    if (error.code === "PGRST103") redirect("/runs");
    throw error;
  }
  type RunRow = { id: string; case_name: string; template_name: string; status: string; run_manager_id: string; created_at: string };
  return { runs: ((data ?? []) as unknown as RunRow[]).map(({ id, case_name, template_name, status, run_manager_id, created_at }) => ({ id, case_name, template_name, status, run_manager_id, created_at })), total: count ?? 0 };
}
