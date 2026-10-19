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
