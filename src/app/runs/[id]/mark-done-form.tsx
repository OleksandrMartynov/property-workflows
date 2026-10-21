"use client";

// Форма «Mark as done». Для останньої обов'язкової задачі — підтвердження з назвою задачі й «This cannot be undone»
// (AC-TASK-04); «Cancel» — форму не надіслано, задача лишається «to do» (AC-TASK-16). Поле confirmed=yes іде в дію
// completeTask лише разом із підтвердженою формою.
import type { FormEvent } from "react";
import { shouldSubmitMarkDone } from "@/lib/runs/confirmation";
import { SubmitButton } from "../../_components/submit-button";

export function MarkDoneForm({
  action,
  runId,
  taskId,
  taskName,
  needsConfirmation,
}: {
  action: (formData: FormData) => Promise<void>;
  runId: string;
  taskId: string;
  taskName: string;
  needsConfirmation: boolean;
}) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!shouldSubmitMarkDone(needsConfirmation, taskName, (message) => window.confirm(message))) event.preventDefault();
  };

  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="task_id" value={taskId} />
      {needsConfirmation ? <input type="hidden" name="confirmed" value="yes" /> : null}
      <SubmitButton
        pendingText="Saving…"
        className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Mark as done
      </SubmitButton>
    </form>
  );
}
