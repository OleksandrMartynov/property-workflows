import { StatusBadge } from "@/components/ui/status-badge";
import { taskStatusLabel } from "@/lib/runs/labels";
import { fromStored } from "@/lib/runs/task-document";
import { MarkDoneForm } from "../mark-done-form";
import type { RunTaskRow } from "./run-detail";
import { TaskDocumentDialog, type TaskDocumentActions } from "./task-document-dialog";

/**
 * Права частина рядка задачі — спільна для менеджера (run-detail) і підрядника (vendor-run-detail): статус задачі,
 * «Parse document» (зріз 4, ADR 0008) і «Mark as done». Обидві дії — лише коли `canEdit` (canCompleteTask: ті самі
 * права й статуси, що перевіряють функції бази complete_task і check_task_document).
 */
export function TaskActions({
  runId,
  task,
  canEdit,
  needsConfirmation,
  completeTask,
  documentActions,
}: {
  runId: string;
  task: RunTaskRow;
  canEdit: boolean;
  needsConfirmation: boolean;
  completeTask: (formData: FormData) => Promise<void>;
  documentActions?: TaskDocumentActions;
}) {
  const isDone = task.status === "done";
  return (
    <>
      <StatusBadge status={isDone ? "done" : "todo"} bare>
        {taskStatusLabel(task.status)}
      </StatusBadge>
      {canEdit && documentActions ? (
        <TaskDocumentDialog runId={runId} taskId={task.id} taskName={task.name} saved={fromStored(task.document)} actions={documentActions} />
      ) : null}
      {canEdit ? <MarkDoneForm action={completeTask} runId={runId} taskId={task.id} taskName={task.name} needsConfirmation={needsConfirmation} /> : null}
    </>
  );
}
