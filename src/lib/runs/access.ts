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
  task: { assignee_id: string; status: string; required?: boolean },
  run: { run_manager_id: string; status: string },
): boolean {
  if (task.status !== "to_do") return false;
  // Позначка — у запуску «in progress»; у «completed» — лише необов'язкова задача (AC-TASK-19, AC-VENDOR-16), як і в
  // complete_task. Невідома обов'язковість — як обов'язкова: кнопки в завершеному запуску немає.
  if (run.status !== "in_progress" && !(run.status === "completed" && task.required === false)) return false;
  return viewer.role === "admin" || task.assignee_id === viewer.id || run.run_manager_id === viewer.id;
}
