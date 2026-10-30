// Прогрес запуску (глосарій PM, «Progress»): «N of M done», де N — задачі зі статусом «done»,
// а M — усі задачі запуску, обов'язкові чи ні (AC-TASK-05, AC-TASK-08, AC-TASK-09).
// У списку запусків done і total рахує база (view run_progress), тут — лише формат і підрахунок для сторінки запуску.

export interface TaskLike {
  status: string;
}

export function countProgress(tasks: readonly TaskLike[]) {
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

export const formatProgress = ({ done, total }: { done: number; total: number }) => `${done} of ${total} done`;

// AC-VENDOR-03, AC-VENDOR-05: лічильник підрядника — лише його задачі запуску (K — їхня кількість, N — «done»), дослівно
// «Your tasks: N of K done» (припущення PM у вимозі #39). Прогресу всього запуску підрядник не бачить (AC-VENDOR-04).
export const formatVendorProgress = ({ done, total }: { done: number; total: number }) => `Your tasks: ${done} of ${total} done`;
