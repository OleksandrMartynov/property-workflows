import { FlashNotice } from "@/components/ui/flash-notice";
import { taskStatusLabel } from "@/lib/runs/labels";

/**
 * Після «Mark as done» сторінка запуску повертається з `?done=task&task=<id>`: видимий відгук дає сам рядок (галочка й
 * статус «done»), а скрінрідер чує «<назва задачі>: done». Задачі, якої немає в переліку (чужа, видалена), — тиша.
 */
export function DoneTaskNotice({ tasks, done, task }: { tasks: { id: string; name: string; status: string }[]; done?: string | string[]; task?: string | string[] }) {
  if (done !== "task" || typeof task !== "string") return null;
  const marked = tasks.find((t) => t.id === task);
  if (!marked) return null;
  return (
    <FlashNotice kind="success" clear={["done", "task"]} quiet>
      {`${marked.name}: ${taskStatusLabel(marked.status)}`}
    </FlashNotice>
  );
}
