"use client";

// Блок «Parse a document» на сторінці запуску (зріз 4, solomchaak/property-workflows-spec#59, AC-DOCAI-01…13).
// Бачать його лише менеджер запуску й адміністратор — це вирішує сторінка (AC-DOCAI-14, 15); права ще раз перевіряють
// дії й функції бази (AC-DOCAI-16). Два кроки, між ними — людина:
//   1. текст (вставлений чи з файлу .txt) → «Propose values»: AI пропонує значення (requestDocumentDraft нічого не пише);
//   2. людина бачить усі значення в полях, виправляє й лише тоді натискає «Save values» (saveRunDocument) або «Discard».
// Форми надсилаються через onSubmit, а не `action`: React 19 після `action` скидає некеровані поля, і після помилки
// (невірний телефон) людина втратила б введене.
import { useId, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { SparkleIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/input";
import { MAX_DOCUMENT_CHARS } from "@/lib/ai/prompts/draft";
import type { Draft } from "@/lib/ai/schema";
import { MESSAGES } from "@/lib/runs/messages";
import type { DocumentDraftState, SaveDocumentState } from "../document-actions";
import { ValueFields } from "./document-fields";

export interface DocumentActions {
  requestDraft: (state: DocumentDraftState, formData: FormData) => Promise<DocumentDraftState>;
  save: (state: SaveDocumentState, formData: FormData) => Promise<SaveDocumentState>;
}

/** Що зараз у блоці: нічого, пропозиція AI на перевірку чи порожні поля для ручного введення (AC-DOCAI-13). */
type Values = { mode: "proposal"; draft: Draft; notice: string | null; seq: number } | { mode: "manual"; seq: number } | null;
type Message = { text: string; tone: "error" | "info" } | null;

/**
 * Відповідь requestDocumentDraft → що показати в блоці: пропозиція з приміткою needs_info (AC-DOCAI-01), порожні поля
 * для ручного введення з повідомленням «недоступний» (AC-DOCAI-13) або лише повідомлення без значень (AC-DOCAI-09, 11, 16).
 */
export function afterProposal(result: DocumentDraftState, seq: number): { values: Values; message: Message } {
  if (result?.status === "draft") {
    return { values: { mode: "proposal", draft: result.draft, notice: result.notice, seq }, message: result.notice ? { text: result.notice, tone: "info" } : null };
  }
  if (result?.status === "unavailable") return { values: { mode: "manual", seq }, message: { text: result.message, tone: "info" } };
  return { values: null, message: result ? { text: result.message, tone: "error" } : null };
}

/** Відповідь saveRunDocument → помилка біля форми; null — збережено (блок очищається) або нічого не сталося. */
export const saveErrorOf = (result: SaveDocumentState) => (result?.status === "error" ? result.message : null);

/** Запускає дію; обрив з'єднання — загальне повідомлення замість сторінки помилки (введене лишається). */
async function guarded<T>(run: () => Promise<T>, onFailure: () => void): Promise<T | undefined> {
  try {
    return await run();
  } catch {
    onFailure();
    return undefined;
  }
}

/** Файл .txt — у поле тексту; інший файл — відмова (AC-DOCAI-12). */
export const isPlainTextFile = (file: { name: string; type: string }) =>
  /\.txt$/i.test(file.name) && (file.type === "" || file.type.startsWith("text/plain"));

const formDataOf = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return new FormData(event.currentTarget);
};

/** Стан блоку й два кроки; обрив з'єднання під час дії — повідомлення в блоці, а не сторінка помилки. */
function useParseDocument(actions: DocumentActions) {
  const [text, setText] = useState("");
  const [values, setValues] = useState<Values>(null);
  const [message, setMessage] = useState<Message>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const [saving, startSave] = useTransition();
  const nextSeq = () => (values?.seq ?? 0) + 1;

  const reset = () => {
    setText("");
    setValues(null);
    setMessage(null);
    setSaveError(null);
  };

  const propose = (formData: FormData) => {
    // AC-DOCAI-03: поки AI читає, значень немає.
    setValues(null);
    setMessage(null);
    setSaveError(null);
    const seq = nextSeq();
    startReading(async () => {
      const result = await guarded(() => actions.requestDraft(null, formData), () => setMessage({ text: MESSAGES.DB_ERROR, tone: "error" }));
      if (result === undefined) return;
      const next = afterProposal(result, seq);
      setValues(next.values);
      setMessage(next.message);
    });
  };

  const save = (formData: FormData) =>
    startSave(async () => {
      const result = await guarded(() => actions.save(null, formData), () => setSaveError(MESSAGES.DB_ERROR));
      if (result === undefined) return;
      if (result?.status === "saved") reset();
      setSaveError(saveErrorOf(result));
    });

  const upload = async (file: File) => {
    setValues(null);
    if (!isPlainTextFile(file)) {
      setMessage({ text: MESSAGES.DOCUMENT_FILE_INVALID, tone: "error" });
      return;
    }
    setMessage(null);
    setText(await file.text());
  };

  return { text, setText, values, message, saveError, reading, saving, propose, save, upload, reset };
}

/** Кнопки кроку 1 і стан читання (AC-DOCAI-03): поки AI читає — «Reading the document…» і вимкнена «Propose values». */
export function ProposeControls({ reading, onUpload }: { reading: boolean; onUpload: () => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onUpload} disabled={reading}>
          Upload a text file
        </Button>
        <Button type="submit" variant="soft" loading={reading} disabled={reading}>
          Propose values
        </Button>
      </div>
      {reading ? (
        <p role="status" className="text-body text-muted-foreground">
          Reading the document…
        </p>
      ) : null}
    </>
  );
}

/** Значення показуємо лише після відповіді: поки AI читає, жодного значення (AC-DOCAI-03). */
export const showsValues = (values: unknown, reading: boolean) => Boolean(values) && !reading;

/**
 * Крок 2: значення на перевірку (AC-DOCAI-01) чи порожні поля (AC-DOCAI-13), примітки моделі, «Save values»
 * (AC-DOCAI-04) і «Discard» (AC-DOCAI-05). Попередження про суму (AC-DOCAI-08) показують самі поля — живим, за
 * поточними позиціями; тут — інші примітки.
 */
export function ValuesForm({
  id,
  runId,
  values,
  saving,
  saveError,
  onSave,
  onDiscard,
}: {
  id: string;
  runId: string;
  values: NonNullable<Values>;
  saving: boolean;
  saveError: string | null;
  onSave: (formData: FormData) => void;
  onDiscard: () => void;
}) {
  const draft = values.mode === "proposal" ? values.draft : null;
  const notes = draft ? draft.notes.filter((note) => !/^items add up to /i.test(note)) : [];
  return (
    <form onSubmit={(event) => onSave(formDataOf(event))} className="flex flex-col gap-4 border-t border-border pt-4" noValidate>
      <input type="hidden" name="run_id" value={runId} />
      <div className="flex items-center gap-2">
        <h3 className="text-heading">Values</h3>
        {draft ? <Badge variant="ai">AI proposal</Badge> : null}
      </div>
      {notes.length ? (
        <Alert variant="info">
          <ul className="flex list-disc flex-col gap-0.5 pl-4" data-testid="document-notes">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {/* Нова пропозиція — нові початкові значення: поля монтуються наново лише з новою пропозицією. */}
      <ValueFields key={values.seq} id={id} draft={draft} />
      {saveError ? <Alert variant="error">{saveError}</Alert> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? "Saving…" : "Save values"}
        </Button>
      </div>
    </form>
  );
}

export function ParseDocumentBlock({ runId, actions }: { runId: string; actions: DocumentActions }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const block = useParseDocument(actions);
  const { values, message, reading, saving } = block;

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void block.upload(file);
  };

  return (
    <Card className="flex flex-col gap-4 p-4" data-testid="parse-document">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-heading">
        <SparkleIcon className="size-4 text-ai-mark" />
        Parse a document
      </h2>
      <form onSubmit={(event) => block.propose(formDataOf(event))} className="flex flex-col gap-3" noValidate aria-labelledby={`${id}-title`}>
        <input type="hidden" name="run_id" value={runId} />
        <Field id={`${id}-text`} label="Document text" counter={MAX_DOCUMENT_CHARS}>
          <Textarea name="text" rows={4} maxRows={12} value={block.text} onChange={(event) => block.setText(event.target.value)} />
        </Field>
        <input ref={fileRef} type="file" accept=".txt,text/plain" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
        <ProposeControls reading={reading} onUpload={() => fileRef.current?.click()} />
        {message ? <Alert variant={message.tone}>{message.text}</Alert> : null}
      </form>

      {values && showsValues(values, reading) ? (
        <ValuesForm id={id} runId={runId} values={values} saving={saving} saveError={block.saveError} onSave={block.save} onDiscard={block.reset} />
      ) : null}
    </Card>
  );
}
