import { FlashNotice } from "@/components/ui/flash-notice";
import { taskStatusLabel } from "@/lib/runs/labels";

/**
 * Після «Mark as done» сторінка запуску повертається з `?done=task&task=<id>`: видимий відгук дає сам рядок (галочка й
 * статус «done»), а скрінрідер чує «<назва задачі>: done». Задачі, якої немає в переліку (чужа, видалена), — тиша.
 */
type TaskLike = { id: string; name: string; status: string };

/** Текст оголошення «<назва задачі>: done» або null, якщо параметрів немає чи задачі немає на сторінці. */
export function doneAnnouncement(tasks: TaskLike[], done?: string | string[], task?: string | string[]) {
  if (done !== "task" || typeof task !== "string") return null;
  const marked = tasks.find((t) => t.id === task);
  return marked ? `${marked.name}: ${taskStatusLabel(marked.status)}` : null;
}

export function DoneTaskNotice({ tasks, done, task }: { tasks: TaskLike[]; done?: string | string[]; task?: string | string[] }) {
  const text = doneAnnouncement(tasks, done, task);
  if (!text) return null;
  return (
    <FlashNotice kind="success" clear={["done", "task"]} quiet>
      {text}
    </FlashNotice>
  );
}
