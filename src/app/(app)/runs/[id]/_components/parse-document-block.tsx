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
    startReading(async () => {
      try {
        const result = await actions.requestDraft(null, formData);
        if (result?.status === "draft") {
          setValues({ mode: "proposal", draft: result.draft, notice: result.notice, seq: nextSeq() });
          setMessage(result.notice ? { text: result.notice, tone: "info" } : null);
        } else if (result?.status === "unavailable") {
          setValues({ mode: "manual", seq: nextSeq() });
          setMessage({ text: result.message, tone: "info" });
        } else if (result?.status === "error") {
          setMessage({ text: result.message, tone: "error" });
        }
      } catch {
        setMessage({ text: MESSAGES.DB_ERROR, tone: "error" });
      }
    });
  };

  const save = (formData: FormData) =>
    startSave(async () => {
      try {
        const result = await actions.save(null, formData);
        if (result?.status === "saved") reset();
        setSaveError(result?.status === "error" ? result.message : null);
      } catch {
        setSaveError(MESSAGES.DB_ERROR);
      }
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

export function ParseDocumentBlock({ runId, actions }: { runId: string; actions: DocumentActions }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const block = useParseDocument(actions);
  const { values, message, reading, saving } = block;
  const notes = values?.mode === "proposal" ? values.draft.notes.filter((note) => !/^items add up to /i.test(note)) : [];

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={reading}>
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
        {message ? <Alert variant={message.tone}>{message.text}</Alert> : null}
      </form>

      {values && !reading ? (
        <form onSubmit={(event) => block.save(formDataOf(event))} className="flex flex-col gap-4 border-t border-border pt-4" noValidate>
          <input type="hidden" name="run_id" value={runId} />
          <div className="flex items-center gap-2">
            <h3 className="text-heading">Values</h3>
            {values.mode === "proposal" ? <Badge variant="ai">AI proposal</Badge> : null}
          </div>
          {/* Попередження про суму (AC-DOCAI-08) показують самі поля — живим, за поточними позиціями; тут — інші примітки. */}
          {notes.length ? (
            <Alert variant="info" data-testid="document-notes">
              <ul className="flex list-disc flex-col gap-0.5 pl-4">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {/* Нова пропозиція — нові початкові значення: поля монтуються наново лише з новою пропозицією. */}
          <ValueFields key={values.seq} id={id} draft={values.mode === "proposal" ? values.draft : null} />
          {block.saveError ? <Alert variant="error">{block.saveError}</Alert> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={block.reset} disabled={saving}>
              Discard
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? "Saving…" : "Save values"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
