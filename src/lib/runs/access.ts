// Хто може позначити задачу виконаною (матриця прав «Mark a task as done»): виконавець задачі,
// менеджер запуску, адміністратор — будь-яку задачу будь-якого запуску. Остаточно це перевіряє функція бази
// complete_task; тут — щоб показувати кнопку лише тим, кому дозволено.
import type { AppRole } from "@/lib/supabase/viewer";

export interface ViewerLike {
  id: string;
  role: AppRole;
}

type TaskLike = { assignee_id: string; status: string };
type RunLike = { run_manager_id: string; status: string };

const isOpen = (task: TaskLike, run: RunLike) => task.status === "to_do" && run.status === "in_progress";
const managesRun = (viewer: ViewerLike, run: RunLike) => run.run_manager_id === viewer.id || viewer.role === "admin";

export function canCompleteTask(viewer: ViewerLike, task: TaskLike, run: RunLike): boolean {
  return isOpen(task, run) && (managesRun(viewer, run) || task.assignee_id === viewer.id);
}

/** Змінити виконавця задачі «to do» може менеджер запуску або адміністратор (остаточно — функція бази reassign_task). */
export function canReassignTask(viewer: ViewerLike, task: TaskLike, run: RunLike): boolean {
  return isOpen(task, run) && managesRun(viewer, run);
}
