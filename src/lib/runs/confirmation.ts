// AC-TASK-04, AC-TASK-16 (припущення PM у вимозі #3): позначка останньої обов'язкової задачі запуску потребує
// підтвердження — користувач бачить назву задачі й «This cannot be undone». Інші задачі — без підтвердження.
// Остаточно правило тримає функція бази complete_task (CONFIRMATION_REQUIRED без p_confirmed).

export interface ConfirmableTask {
  id: string;
  required: boolean;
  status: string;
}

/** Задача обов'язкова, ще «to do», а решта обов'язкових задач запуску вже «done». */
export function isLastRequiredTask(task: ConfirmableTask, tasks: readonly ConfirmableTask[]): boolean {
  if (!task.required || task.status !== "to_do") return false;
  return tasks.every((other) => other.id === task.id || !other.required || other.status === "done");
}

export const CANNOT_BE_UNDONE = "This cannot be undone";

export const confirmationText = (taskName: string) => `${taskName}\n\n${CANNOT_BE_UNDONE}`;

/**
 * Чи надсилати форму «Mark as done»: без підтвердження — так; для останньої обов'язкової — лише якщо користувач
 * підтвердив (confirm повертає true). «Cancel» — форма не надсилається, задача лишається «to do».
 */
export function shouldSubmitMarkDone(
  needsConfirmation: boolean,
  taskName: string,
  confirm: (message: string) => boolean,
): boolean {
  return needsConfirmation ? confirm(confirmationText(taskName)) : true;
}
