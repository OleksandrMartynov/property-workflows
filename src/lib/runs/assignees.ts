// Виконавці задач під час запуску (AC-RUN-04, AC-RUN-08, AC-RUN-09): з форми приходить пара
// «задача шаблону → користувач»; задачі, де обрано самого менеджера запуску або нічого, не передаємо —
// функція launch_run ставить на них менеджера запуску.

/** Поле форми запуску для задачі шаблону. */
export const assigneeField = (templateTaskId: string) => `assignee_${templateTaskId}`;

export function collectAssignees(
  formData: Pick<FormData, "get">,
  templateTaskIds: readonly string[],
  runManagerId: string,
): Record<string, string> {
  const assignees: Record<string, string> = {};
  for (const taskId of templateTaskIds) {
    const value = String(formData.get(assigneeField(taskId)) ?? "").trim();
    if (value && value !== runManagerId) assignees[taskId] = value;
  }
  return assignees;
}
