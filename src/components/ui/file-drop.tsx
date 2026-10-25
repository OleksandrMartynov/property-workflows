"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import "./controls.css";
import { FieldMessage } from "./field";

type FileState = "ready" | "uploading" | "done" | "error";

interface Entry {
  id: string;
  file: File;
  state: FileState;
  progress: number;
  error?: string;
  leaving?: boolean;
}

const MB = 1024 * 1024;
const sizeLabel = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Чи підходить файл під атрибут `accept` (розширення `.pdf`, mime `application/pdf`, шаблон `image/*`). */
function matchesAccept(file: File, accept: string) {
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => (token.startsWith(".") ? name.endsWith(token) : token.endsWith("/*") ? type.startsWith(token.slice(0, -1)) : type === token));
}

const svgProps = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const UploadGlyph = () => (
  <svg {...svgProps}>
    <path d="M8 10.25V2.75M5 5.5l3-2.75 3 2.75M3 10.25v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
  </svg>
);
const FileGlyph = () => (
  <svg {...svgProps}>
    <path d="M4 2.5h5.25l3.25 3.25V13a.5.5 0 01-.5.5H4a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z" />
    <path d="M9 2.75V6h3.25" />
  </svg>
);
const DoneGlyph = () => (
  <svg {...svgProps} data-state="done">
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);
const ErrorGlyph = (props: { "data-state"?: string }) => (
  <svg {...svgProps} {...props}>
    <circle cx="8" cy="8" r="5.75" />
    <path d="M8 5v3.5M8 10.75v.01" />
  </svg>
);
const CloseGlyph = () => (
  <svg {...svgProps}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
const TrashGlyph = () => (
  <svg {...svgProps}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.25h5.8l.6-8.25M6.75 7v3.5M9.25 7v3.5" />
  </svg>
);

export interface FileDropProps {
  label: ReactNode;
  /** Підказка під зоною (спільний слот із помилкою). */
  hint?: ReactNode;
  /** Помилка рівня форми: «Attach the lease agreement». */
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  /** Ім'я `<input type="file">`: прийняті файли йдуть у FormData / server action. */
  name?: string;
  /** Як атрибут `accept`: розширення й mime через кому. */
  accept?: string;
  /** Як називати тип у текстах («PDF»). */
  kind?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  disabled?: boolean;
  /** Необов'язкове завантаження з прогресом; без нього файли лишаються «готовими» до відправки з формою. */
  upload?: (file: File, ctx: { onProgress: (fraction: number) => void; signal: AbortSignal }) => Promise<void>;
  /** Викликається зі списком прийнятих (валідних) файлів щоразу, коли він змінюється. */
  onFilesChange?: (files: File[]) => void;
  className?: string;
}

/**
 * Зона для файлів: «Choose file» є завжди (клавіатура, клік по зоні — теж відкриває вибір), перетягування — додаток.
 * Справжній `<input type="file">` схований візуально й несе файли у форму (`name`). Відхилені файли лишаються в списку
 * з причиною («PDF up to 20 MB.»). Список — `aria-live`, прогрес — `role="progressbar"`, видалення називає файл.
 */
export function FileDrop({
  label,
  hint,
  error,
  required,
  optional,
  name,
  accept = "application/pdf,.pdf",
  kind = "PDF",
  multiple = true,
  maxSizeMB = 20,
  disabled = false,
  upload,
  onFilesChange,
  className,
}: FileDropProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLButtonElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [flash, setFlash] = useState(false);
  const sequence = useRef(0);

  const limitHint = `${kind} up to ${maxSizeMB} MB.`;
  const noun = multiple ? "files" : "a file";
  const title = dragOver ? "Drop to upload" : `Drag ${multiple ? kind + " files" : "a " + kind} here`;

  // Прийняті файли повертаємо в схований input, щоб вони поїхали з формою (відхилені туди не потрапляють)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    try {
      const transfer = new DataTransfer();
      entries.filter((e) => e.state !== "error" && !e.leaving).forEach((e) => transfer.items.add(e.file));
      input.files = transfer.files;
    } catch {
      /* DataTransfer недоступний: файли лишаються в onFilesChange */
    }
  }, [entries]);

  const acceptedKey = entries.filter((e) => e.state !== "error" && !e.leaving).map((e) => e.id).join("|");
  const onFilesChangeRef = useRef(onFilesChange);
  useEffect(() => {
    onFilesChangeRef.current = onFilesChange;
  });
  useEffect(() => {
    onFilesChangeRef.current?.(entries.filter((e) => e.state !== "error" && !e.leaving).map((e) => e.file));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сповіщаємо лише коли змінився склад прийнятих
  }, [acceptedKey]);

  useEffect(() => {
    const live = controllers.current;
    return () => {
      live.forEach((c) => c.abort());
      clearTimeout(flashTimer.current);
    };
  }, []);

  const patch = (entryId: string, change: Partial<Entry>) => setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...change } : e)));

  const startUpload = (entry: Entry) => {
    if (!upload) return;
    const controller = new AbortController();
    controllers.current.set(entry.id, controller);
    patch(entry.id, { state: "uploading", progress: 0 });
    upload(entry.file, { signal: controller.signal, onProgress: (fraction) => patch(entry.id, { progress: Math.min(1, Math.max(0, fraction)) }) })
      .then(() => patch(entry.id, { state: "done", progress: 1 }))
      .catch(() => {
        if (!controller.signal.aborted) patch(entry.id, { state: "error", error: "Upload failed. Try again." });
      })
      .finally(() => controllers.current.delete(entry.id));
  };

  const add = (files: File[]) => {
    if (disabled || files.length === 0) return;
    const incoming = multiple ? files : files.slice(0, 1);
    const fresh = incoming.map((file): Entry => {
      const base = { id: `${id}-${++sequence.current}`, file, progress: 0 };
      if (!matchesAccept(file, accept)) return { ...base, state: "error", error: `Only ${kind} files are accepted. ${limitHint}` };
      if (file.size > maxSizeMB * MB) return { ...base, state: "error", error: `File is too large (${sizeLabel(file.size)}). ${limitHint}` };
      return { ...base, state: "ready" };
    });
    if (!multiple) {
      controllers.current.forEach((c) => c.abort());
      controllers.current.clear();
    }
    setEntries((prev) => [...fresh, ...(multiple ? prev : [])]);
    fresh.filter((e) => e.state === "ready").forEach(startUpload);
    if (fresh.some((e) => e.state === "error")) {
      setFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 2200);
    }
  };

  const remove = (entry: Entry) => {
    controllers.current.get(entry.id)?.abort();
    controllers.current.delete(entry.id);
    patch(entry.id, { leaving: true });
    setTimeout(() => setEntries((prev) => prev.filter((e) => e.id !== entry.id)), 160);
    pickRef.current?.focus();
  };

  const onDragEnter = (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    setDragOver(true);
  };
  const onDragOver = (event: DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    add(Array.from(event.dataTransfer.files));
  };

  const labelId = `${id}-label`;
  const describedBy = [`${id}-title`, `${id}-limit`, hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div role="group" aria-labelledby={labelId} className={cn("flex min-w-0 flex-col", className)}>
      <div className="mb-1.5 flex min-h-[18px] items-center justify-between gap-3">
        <span id={labelId} className="text-label font-medium text-foreground">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 font-semibold text-destructive">
              *
            </span>
          ) : null}
        </span>
        {optional ? <span className="text-meta text-muted-foreground">Optional</span> : null}
      </div>

      <div
        className="ctl-drop"
        data-state={dragOver ? "dragover" : undefined}
        data-invalid={flash || error ? "" : undefined}
        aria-disabled={disabled || undefined}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(event) => {
          if (disabled || (event.target as HTMLElement).closest("button, a, input")) return;
          inputRef.current?.click();
        }}
      >
        <svg className="ctl-drop__border" aria-hidden="true">
          <rect />
        </svg>
        <span className="ctl-drop__icon" aria-hidden="true">
          <UploadGlyph />
        </span>
        <p id={`${id}-title`} className="ctl-drop__title">
          {title}
        </p>
        <p id={`${id}-limit`} className="ctl-drop__hint">
          {limitHint}
        </p>
        <Button ref={pickRef} variant="secondary" size="sm" id={`${id}-pick`} disabled={disabled} aria-labelledby={`${labelId} ${id}-pick`} aria-describedby={describedBy} onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => add(Array.from(event.target.files ?? []))}
        />
      </div>

      <ul className="ctl-files" aria-live="polite" aria-label={`Selected ${noun}`}>
        {entries.map((entry) => {
          const done = entry.state === "done";
          const bad = entry.state === "error";
          return (
            <li key={entry.id} className="ctl-file" data-state={entry.state === "ready" ? undefined : entry.state} data-leaving={entry.leaving ? "" : undefined}>
              <span className="ctl-file__icon" aria-hidden="true">
                <FileGlyph />
                <DoneGlyph />
                <ErrorGlyph data-state="error" />
              </span>
              <div className="ctl-file__main">
                <span className="ctl-file__name" title={entry.file.name}>
                  {entry.file.name}
                </span>
                <span className="ctl-file__meta">
                  {bad ? (
                    <>
                      <ErrorGlyph />
                      <span>{entry.error}</span>
                    </>
                  ) : (
                    <>
                      <span>{sizeLabel(entry.file.size)}</span>
                      {entry.state === "uploading" ? <span>· {Math.round(entry.progress * 100)}%</span> : null}
                      {done ? <span>· Uploaded</span> : null}
                    </>
                  )}
                </span>
              </div>
              <button type="button" className="ctl-iconbtn" aria-label={`${entry.state === "uploading" ? "Cancel upload of" : "Remove"} ${entry.file.name}`} onClick={() => remove(entry)}>
                {entry.state === "uploading" ? <CloseGlyph /> : <TrashGlyph />}
              </button>
              <div className="ctl-file__prog" aria-hidden={entry.state !== "uploading"}>
                <div>
                  <div className="ctl-progress" role="progressbar" aria-label={`Uploading ${entry.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(entry.progress * 100)}>
                    <i style={{ "--p": entry.progress } as CSSProperties} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="ctl-foot">
        <FieldMessage id={id} hint={hint} error={error} />
      </div>
    </div>
  );
}
