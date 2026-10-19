// Статуси — словами глосарію PM (requirements/product.md): Task status «to do» / «done», Run status «in progress» / «completed».

export const TASK_STATUS_LABELS: Record<string, string> = { to_do: "to do", done: "done" };
export const RUN_STATUS_LABELS: Record<string, string> = { in_progress: "in progress", completed: "completed" };

export const taskStatusLabel = (status: string) => TASK_STATUS_LABELS[status] ?? status;
export const runStatusLabel = (status: string) => RUN_STATUS_LABELS[status] ?? status;
