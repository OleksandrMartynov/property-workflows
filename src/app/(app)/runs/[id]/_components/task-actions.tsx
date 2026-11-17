import { StatusBadge } from "@/components/ui/status-badge";
import { taskStatusLabel } from "@/lib/runs/labels";
import { MarkDoneForm } from "../mark-done-form";
import type { RunTaskRow } from "./run-detail";

/**
 * Права частина рядка задачі — спільна для менеджера (run-detail) і підрядника (vendor-run-detail): статус задачі й
 * «Mark as done» — лише коли `canEdit` (canCompleteTask: ті самі права й статуси, що перевіряє complete_task).
 * Документ — не в задачі, а в блоці «Parse a document» сторінки запуску (зріз 4, AC-DOCAI-14, 15).
 */
export function TaskActions({
  runId,
  task,
  canEdit,
  needsConfirmation,
  completeTask,
}: {
  runId: string;
  task: RunTaskRow;
  canEdit: boolean;
  needsConfirmation: boolean;
  completeTask: (formData: FormData) => Promise<void>;
}) {
  const isDone = task.status === "done";
  return (
    <>
      <StatusBadge status={isDone ? "done" : "todo"} bare>
        {taskStatusLabel(task.status)}
      </StatusBadge>
      {canEdit ? <MarkDoneForm action={completeTask} runId={runId} taskId={task.id} taskName={task.name} needsConfirmation={needsConfirmation} /> : null}
    </>
  );
}
