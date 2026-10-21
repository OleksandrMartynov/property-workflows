"use client";

// Форма «Mark as done». Звичайна задача — серверна дія напряму (працює й без JavaScript). Остання обов'язкова задача —
// клієнтська дія withConfirmation: підтвердження з назвою задачі й «This cannot be undone» (AC-TASK-04); «Cancel» —
// серверну дію не викликано, задача лишається «to do» (AC-TASK-16). Поле confirmed=yes додається лише після «OK»
// і в HTML від сервера його немає.
import { withConfirmation } from "@/lib/runs/confirmation";
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
  const formAction = needsConfirmation ? withConfirmation(action, taskName, (message) => window.confirm(message)) : action;

  return (
    <form action={formAction}>
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="task_id" value={taskId} />
      <SubmitButton
        pendingText="Saving…"
        className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Mark as done
      </SubmitButton>
    </form>
  );
}
