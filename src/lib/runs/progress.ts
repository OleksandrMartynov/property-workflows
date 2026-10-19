// Прогрес запуску (глосарій PM, «Progress»): «N of M done», де N — задачі зі статусом «done»,
// а M — усі задачі запуску, обов'язкові чи ні (AC-TASK-05, AC-TASK-08, AC-TASK-09).

export interface TaskLike {
  status: string;
}

export function countProgress(tasks: readonly TaskLike[]) {
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

export const formatProgress = ({ done, total }: { done: number; total: number }) => `${done} of ${total} done`;

/** Прогрес кожного запуску зі списку задач кількох запусків (для списку запусків). */
export function progressByRun(tasks: readonly (TaskLike & { run_id: string })[]) {
  const byRun = new Map<string, { done: number; total: number }>();
  for (const task of tasks) {
    const p = byRun.get(task.run_id) ?? { done: 0, total: 0 };
    p.total += 1;
    if (task.status === "done") p.done += 1;
    byRun.set(task.run_id, p);
  }
  return byRun;
}
