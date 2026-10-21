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
 * Дія форми «Mark as done» для останньої обов'язкової задачі: спершу підтвердження з назвою задачі й «This cannot be
 * undone»; лише після «OK» — поле confirmed=yes і серверна дія (AC-TASK-04). «Cancel» — серверну дію не викликано,
 * задача лишається «to do» (AC-TASK-16). Поле confirmed не рендериться в HTML, тож без підтвердження його не надіслати.
 */
export function withConfirmation(
  action: (formData: FormData) => Promise<void>,
  taskName: string,
  confirm: (message: string) => boolean,
): (formData: FormData) => Promise<void> {
  return async (formData) => {
    if (!confirm(confirmationText(taskName))) return;
    formData.set("confirmed", "yes");
    await action(formData);
  };
}
