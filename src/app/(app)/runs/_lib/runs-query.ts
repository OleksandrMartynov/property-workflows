import { redirect } from "next/navigation";
import type { requireViewer } from "@/lib/supabase/viewer";
import { ilikePattern, type RunView } from "@/lib/runs/views";

type Session = Awaited<ReturnType<typeof requireViewer>>;

export const PAGE_SIZE = 50;

/**
 * Сторінка списку запусків з виглядом і пошуком. Видимість — RLS (AC-TASK-06), порядок — від новіших (AC-TASK-14).
 * «Mine» — запуски, де в мене є задача «to do» (id з run_tasks, теж під RLS).
 */
export async function loadRunsPage({ supabase, viewer }: Session, { view, query, page }: { view: RunView; query: string; page: number }) {
  const from = (page - 1) * PAGE_SIZE;
  let request = supabase
    .from("runs")
    .select("id, case_name, template_name, status, run_manager_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");

  if (view === "in_progress" || view === "completed") request = request.eq("status", view);
  if (view === "mine") {
    const { data: mine, error } = await supabase.from("run_tasks").select("run_id").eq("assignee_id", viewer.id).eq("status", "to_do");
    if (error) throw error;
    request = request.in("id", [...new Set((mine ?? []).map((t) => t.run_id))]);
  }
  if (query) request = request.ilike("case_name", ilikePattern(query));

  const { data, error, count } = await request.range(from, from + PAGE_SIZE - 1);
  if (error) {
    // Сторінка за межами результатів (?page=999): PostgREST з count=exact відповідає 416 PGRST103.
    if (error.code === "PGRST103") redirect("/runs");
    throw error;
  }
  return { runs: data ?? [], total: count ?? 0 };
}
