// Хто може позначити задачу виконаною (матриця прав «Mark a task as done»): виконавець задачі,
// менеджер запуску, адміністратор — будь-яку задачу будь-якого запуску. Остаточно це перевіряє функція бази
// complete_task; тут — щоб показувати кнопку лише тим, кому дозволено.
import type { AppRole } from "@/lib/supabase/viewer";

export interface ViewerLike {
  id: string;
  role: AppRole;
}

export function canCompleteTask(
  viewer: ViewerLike,
  task: { assignee_id: string; status: string },
  run: { run_manager_id: string; status: string },
): boolean {
  if (task.status !== "to_do" || run.status !== "in_progress") return false;
  return viewer.role === "admin" || task.assignee_id === viewer.id || run.run_manager_id === viewer.id;
}

/**
 * Хто бачить блок «Parse a document» і записи документів запуску (AC-DOCAI-14, 15): лише адміністратор і менеджер
 * цього запуску; виконавець задачі (підрядник чи інший менеджер) — ні. Остаточно це перевіряють check_run_document,
 * save_run_document і RLS run_documents (AC-DOCAI-16).
 */
export function canParseDocuments(viewer: ViewerLike, run: { run_manager_id: string }): boolean {
  return viewer.role === "admin" || (viewer.role === "manager" && run.run_manager_id === viewer.id);
}
