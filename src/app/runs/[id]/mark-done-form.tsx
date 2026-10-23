"use client";

// Форма «Mark as done». Звичайна задача — серверна дія напряму (працює й без JavaScript). Остання обов'язкова задача —
// діалог підтвердження з назвою задачі й «This cannot be undone» (AC-TASK-04); «Cancel» — серверну дію не викликано,
// задача лишається «to do» (AC-TASK-16). Поле confirmed=yes додає withConfirmation лише після «OK»; у HTML від
// сервера його немає.
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CANNOT_BE_UNDONE, withConfirmation } from "@/lib/runs/confirmation";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const hidden = (
    <>
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="task_id" value={taskId} />
    </>
  );

  if (!needsConfirmation) {
    return (
      <form action={action}>
        {hidden}
        <SubmitButton pendingText="Saving…" variant="outline" size="sm">
          Mark as done
        </SubmitButton>
      </form>
    );
  }

  // «OK» у діалозі — і є підтвердження: withConfirmation додає confirmed=yes і викликає серверну дію.
  const confirm = () => {
    setOpen(false);
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(() => withConfirmation(action, taskName, () => true)(formData));
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {hidden}
        <Button type="submit" variant="outline" size="sm" loading={pending} aria-disabled={pending}>
          {pending ? "Saving…" : "Mark as done"}
        </Button>
      </form>
      <ConfirmDialog open={open} title={taskName} description={CANNOT_BE_UNDONE} onCancel={() => setOpen(false)} onConfirm={confirm} />
    </>
  );
}
