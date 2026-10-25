import type { createClient } from "@/lib/supabase/server";
import type { RunSummary } from "../_components/runs-list";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Підсумки запусків для таблиці: прогрес («N of M done») рахує база (view run_progress), наступна задача — перша
 * невиконана за порядком секцій і позицій, виконавці — унікальні email задач. Чужі запуски RLS не віддає.
 */
export async function loadRunSummaries(supabase: Supabase, runIds: string[]) {
  const [progressResult, tasksResult, usersResult] = await Promise.all([
    runIds.length ? supabase.from("run_progress").select("run_id, done, total").in("run_id", runIds) : Promise.resolve({ data: [], error: null }),
    runIds.length
      ? supabase.from("run_tasks").select("run_id, name, status, section_position, position, assignee_id").in("run_id", runIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.rpc("list_assignable_users"),
  ]);
  if (progressResult.error) throw progressResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (usersResult.error) throw usersResult.error;

  const emailOf = new Map((usersResult.data ?? []).map((u) => [u.id, u.email]));
  const summary: Record<string, RunSummary> = {};
  for (const p of progressResult.data ?? []) {
    if (p.run_id) summary[p.run_id] = { done: p.done ?? 0, total: p.total ?? 0, nextTask: null, assignees: [] };
  }
  const ordered = [...(tasksResult.data ?? [])].sort((a, b) => a.section_position - b.section_position || a.position - b.position);
  for (const task of ordered) {
    if (!task.run_id) continue;
    const entry = (summary[task.run_id] ??= { done: 0, total: 0, nextTask: null, assignees: [] });
    if (task.status === "to_do" && entry.nextTask === null) entry.nextTask = task.name;
    const email = emailOf.get(task.assignee_id);
    if (email && !entry.assignees.includes(email)) entry.assignees.push(email);
  }
  return { summary, emailOf };
}
