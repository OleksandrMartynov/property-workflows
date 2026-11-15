"use client";

// «Parse document» у рядку задачі (зріз 4, ADR 0008). Два кроки в одному вікні, між ними — людина:
//   1. текст документа або PDF → «Propose values»: AI пропонує значення (requestDocumentDraft нічого не пише);
//   2. людина бачить усі значення в полях, виправляє й лише тоді натискає «Save values» (saveTaskDocument).
// Поля працюють і без AI: коли помічник недоступний чи відмовив, значення вводять вручну.
//
// Кожне відкриття — новий сеанс (DocumentSession з власним key): стара пропозиція не повертається після «Cancel», а
// початкові значення беруться з актуального збереженого. Форми надсилаються через onSubmit, а не `action`: React 19
// після `action` скидає некеровані поля, і після помилки (невірний телефон, 429) людина втратила б введене.
import { useId, useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogCancel, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { SparkleIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/input";
import { MAX_DOCUMENT_CHARS } from "@/lib/ai/prompts/draft";
import type { Draft } from "@/lib/ai/schema";
import { MESSAGES } from "@/lib/runs/messages";
import type { TaskDocument } from "@/lib/runs/task-document";
import type { DocumentDraftState, SaveDocumentState } from "../document-actions";
import { ValueFields } from "./task-document-fields";

export interface TaskDocumentActions {
  requestDraft: (state: DocumentDraftState, formData: FormData) => Promise<DocumentDraftState>;
  save: (state: SaveDocumentState, formData: FormData) => Promise<SaveDocumentState>;
}

interface DialogProps {
  runId: string;
  taskId: string;
  taskName: string;
  saved: TaskDocument | null;
  actions: TaskDocumentActions;
}

// Палець — не курсор: на сенсорному екрані кнопка 40 px, як «Mark as done».
const TAP = "pointer-coarse:h-10 pointer-coarse:px-3.5";

export function TaskDocumentDialog(props: DialogProps) {
  const [dialog, setDialog] = useState({ session: 0, open: false });
  const { session, open } = dialog;
  // Закриває лише свій сеанс: відповідь збереження, що прийшла після «Cancel» і нового відкриття, нове вікно не закриє.
  const close = () => setDialog((current) => (current.session === session ? { ...current, open: false } : current));
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={TAP}
        aria-haspopup="dialog"
        onClick={() => setDialog((current) => ({ session: current.session + 1, open: true }))}
      >
        <SparkleIcon />
        {props.saved ? "Edit document" : "Parse document"}
      </Button>
      {/* Вікно з формами існує лише відкритим: у запуску десятки задач, і кожна несла б дві форми. */}
      {open ? <DocumentSession key={session} {...props} onClose={close} /> : null}
    </>
  );
}

/** Остання вдала пропозиція AI; `seq` змінюється лише з новою пропозицією — помилка повтору полів не скидає. */
type Proposal = { draft: Draft; notice: string | null; seq: number };

const formDataOf = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return new FormData(event.currentTarget);
};

/** Стан сеансу: остання вдала пропозиція, помилки двох кроків і самі кроки (без скидання полів після помилки). */
function useDocumentSession(actions: TaskDocumentActions, onClose: () => void) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [requesting, startRequest] = useTransition();
  const [saving, startSave] = useTransition();

  // Обрив з'єднання під час Server Action — виняток з await: показуємо повідомлення біля форми, а не Error Boundary
  // (інакше вікно з введеним зникло б). Текст винятку не показуємо.
  const propose = (formData: FormData) =>
    startRequest(async () => {
      try {
        const result = await actions.requestDraft(null, formData);
        if (result?.status === "draft") setProposal((prev) => ({ draft: result.draft, notice: result.notice, seq: (prev?.seq ?? 0) + 1 }));
        setRequestError(result?.status === "error" ? result.message : null);
      } catch {
        setRequestError(MESSAGES.DB_ERROR);
      }
    });

  const save = (formData: FormData) =>
    startSave(async () => {
      try {
        const result = await actions.save(null, formData);
        if (result?.status === "saved") onClose();
        setSaveError(result?.status === "error" ? result.message : null);
      } catch {
        setSaveError(MESSAGES.DB_ERROR);
      }
    });

  return { proposal, requestError, saveError, requesting, saving, propose, save };
}

function DocumentSession({ runId, taskId, taskName, saved, actions, onClose }: DialogProps & { onClose: () => void }) {
  const id = useId();
  const formId = `${id}-values`;
  const { proposal, requestError, saveError, requesting, saving, propose, save } = useDocumentSession(actions, onClose);
  const draft = proposal?.draft ?? null;

  return (
    <Dialog open onClose={onClose} labelledBy={`${id}-title`} describedBy={`${id}-task`} size="lg">
      <DialogHeader icon={<SparkleIcon />} title="Parse document" titleId={`${id}-title`} description={taskName} descriptionId={`${id}-task`} />
      <div className="flex flex-col gap-6 px-6 pb-6">
        <DocumentRequestForm id={id} taskId={taskId} pending={requesting} onPropose={propose} message={requestError ?? proposal?.notice ?? null} isError={Boolean(requestError)} />
        <form id={formId} onSubmit={(event) => save(formDataOf(event))} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="run_id" value={runId} />
          <input type="hidden" name="task_id" value={taskId} />
          <ValuesHeader draft={draft} />
          {/* Нова пропозиція — нові початкові значення: поля монтуються наново лише з новою вдалою пропозицією. */}
          <ValueFields key={proposal?.seq ?? 0} id={id} draft={draft} saved={saved} />
          {saveError ? <Alert variant="error">{saveError}</Alert> : null}
        </form>
      </div>
      <DialogFooter>
        <DialogCancel onClick={onClose} />
        <Button type="submit" form={formId} loading={saving}>
          {saving ? "Saving…" : "Save values"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** Крок 1: документ текстом або файлом → пропозиція AI. Відмова, ліміт, «недоступний» чи needs_info — повідомлення тут же. */
function DocumentRequestForm({
  id,
  taskId,
  pending,
  onPropose,
  message,
  isError,
}: {
  id: string;
  taskId: string;
  pending: boolean;
  onPropose: (formData: FormData) => void;
  message: string | null;
  isError: boolean;
}) {
  return (
    <form onSubmit={(event) => onPropose(formDataOf(event))} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="task_id" value={taskId} />
      <Field id={`${id}-text`} label="Document text" counter={MAX_DOCUMENT_CHARS}>
        <Textarea name="text" rows={4} maxRows={10} maxLength={MAX_DOCUMENT_CHARS} />
      </Field>
      <FileDrop label="Document file" name="file" multiple={false} maxSizeMB={1} accept="application/pdf,.pdf,image/png,image/jpeg" kind="PDF" />
      <div className="flex justify-end">
        <Button type="submit" variant="soft" loading={pending}>
          {pending ? "Reading…" : "Propose values"}
        </Button>
      </div>
      {message ? <Alert variant={isError ? "error" : "info"}>{message}</Alert> : null}
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
