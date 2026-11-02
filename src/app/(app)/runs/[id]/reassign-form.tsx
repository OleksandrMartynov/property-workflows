"use client";

// Зміна виконавця задачі: вибір користувача й «Reassign». Значення йде у форму прихованим input Select.
import { useId } from "react";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/app/_components/submit-button";

export function ReassignForm({
  action,
  runId,
  taskId,
  taskName,
  assigneeId,
  users,
}: {
  action: (formData: FormData) => Promise<void>;
  runId: string;
  taskId: string;
  taskName: string;
  assigneeId: string;
  users: { id: string; email: string }[];
}) {
  const id = useId();
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="task_id" value={taskId} />
      <Select
        id={id}
        name="assignee_id"
        defaultValue={assigneeId}
        aria-label={`Assignee of ${taskName}`}
        options={users.map((u) => ({ value: u.id, label: u.email }))}
        className="w-56"
      />
      <SubmitButton pendingText="Saving…" variant="outline" size="sm">
        Reassign
      </SubmitButton>
    </form>
  );
}
