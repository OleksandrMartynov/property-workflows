"use client";

// «Parse document» у рядку задачі (зріз 4, ADR 0008). Два кроки в одному вікні, між ними — людина:
//   1. текст документа або PDF → «Propose values»: AI пропонує значення (requestDocumentDraft нічого не пише);
//   2. людина бачить усі значення в полях, виправляє й лише тоді натискає «Save values» (saveTaskDocument).
// Поля працюють і без AI: коли помічник недоступний чи відмовив, значення вводять вручну.
import { useActionState, useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogCancel, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { SparkleIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/input";
import type { Draft } from "@/lib/ai/schema";
import type { TaskDocument } from "@/lib/runs/task-document";
import type { DocumentDraftState, SaveDocumentState } from "../document-actions";
import { ValueFields } from "./task-document-fields";

export interface TaskDocumentActions {
  requestDraft: (state: DocumentDraftState, formData: FormData) => Promise<DocumentDraftState>;
  save: (state: SaveDocumentState, formData: FormData) => Promise<SaveDocumentState>;
}

// Палець — не курсор: на сенсорному екрані кнопка 40 px, як «Mark as done».
const TAP = "pointer-coarse:h-10 pointer-coarse:px-3.5";

export function TaskDocumentDialog({
  runId,
  taskId,
  taskName,
  saved,
  actions,
}: {
  runId: string;
  taskId: string;
  taskName: string;
  saved: TaskDocument | null;
  actions: TaskDocumentActions;
}) {
  const id = useId();
  const formId = `${id}-values`;
  const [draftState, requestAction, requesting] = useActionState(actions.requestDraft, null);
  const [saveState, saveAction, saving] = useActionState(actions.save, null);
  // Вікно закрите, коли відкриття немає або після нього збереження вдалося (без ефекту зі setState).
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const open = openedAt !== null && !(saveState?.status === "saved" && saveState.at > openedAt);
  const draft = draftState?.status === "draft" ? draftState.draft : null;
  const close = () => setOpenedAt(null);

  return (
    <>
      <Button variant="outline" size="sm" className={TAP} aria-haspopup="dialog" onClick={() => setOpenedAt(Date.now())}>
        <SparkleIcon />
        {saved ? "Edit document" : "Parse document"}
      </Button>
      {/* Вікно з формами монтується лише після першого відкриття: у запуску десятки задач, і кожна несла б дві форми. */}
      {openedAt === null ? null : (
        <Dialog open={open} onClose={close} labelledBy={`${id}-title`} describedBy={`${id}-task`} size="lg">
          <DialogHeader icon={<SparkleIcon />} title="Parse document" titleId={`${id}-title`} description={taskName} descriptionId={`${id}-task`} />
          <div className="flex flex-col gap-6 px-6 pb-6">
            <DocumentRequestForm id={id} taskId={taskId} state={draftState} action={requestAction} pending={requesting} />
            <form id={formId} action={saveAction} className="flex flex-col gap-4" noValidate>
              <input type="hidden" name="run_id" value={runId} />
              <input type="hidden" name="task_id" value={taskId} />
              <ValuesHeader draft={draft} />
              {/* Нова пропозиція — нові початкові значення: поля монтуються наново з ключем пропозиції. */}
              <ValueFields key={draftState?.status === "draft" ? draftState.at : "saved"} id={id} draft={draft} saved={saved} />
              {saveState?.status === "error" ? <Alert variant="error">{saveState.message}</Alert> : null}
            </form>
          </div>
          <DialogFooter>
            <DialogCancel onClick={close} />
            <Button type="submit" form={formId} loading={saving}>
              {saving ? "Saving…" : "Save values"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  );
}

/** Крок 1: документ текстом або файлом → пропозиція AI. Відмова, ліміт чи «недоступний» — повідомлення тут же. */
function DocumentRequestForm({
  id,
  taskId,
  state,
  action,
  pending,
}: {
  id: string;
  taskId: string;
  state: DocumentDraftState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="task_id" value={taskId} />
      <Field id={`${id}-text`} label="Document text">
        <Textarea name="text" rows={4} maxRows={10} />
      </Field>
      <FileDrop label="Document file" name="file" multiple={false} maxSizeMB={1} accept="application/pdf,.pdf,image/png,image/jpeg" kind="PDF" />
      <div className="flex justify-end">
        <Button type="submit" variant="soft" loading={pending}>
          {pending ? "Reading…" : "Propose values"}
        </Button>
      </div>
      {state?.status === "error" ? <Alert variant="error">{state.message}</Alert> : null}
      {state?.status === "draft" && state.notice ? <Alert variant="info">{state.notice}</Alert> : null}
    </form>
  );
}

/** Заголовок кроку 2: позначка «AI proposal», поки в полях пропозиція, і примітки моделі й коду (кейси 3, 6, 8, 10 PM). */
function ValuesHeader({ draft }: { draft: Draft | null }) {
  return (
    <>
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <h3 className="text-heading">Values</h3>
        {draft ? <Badge variant="ai">AI proposal</Badge> : null}
      </div>
      {draft?.notes.length ? (
        <Alert variant="info">
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {draft.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </>
  );
}
