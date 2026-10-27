"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { CheckIcon, TrashIcon } from "./icons";

const SIZES = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-xl" } as const;

/**
 * Модальне вікно на нативному <dialog>: фокус-пастка, Esc і inert-фон дає браузер, вхід і вихід — CSS (.ui-dialog).
 * На вузькому екрані вікно стає нижнім аркушем (притиснуте до низу, на всю ширину). `alertdialog` не закривається
 * кліком повз вікно й не має хрестика: на запитанні, що не має відкату, відповідь — лише кнопкою.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  size = "md",
  closable = role === "dialog",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  size?: keyof typeof SIZES;
  /** Хрестик у куті. За замовчуванням — у звичайному діалозі; палітра ⌘K і `alertdialog` без нього. */
  closable?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Нативна подія close приходить на будь-яке закриття, зокрема на el.close() нижче, коли батько вже поставив
  // open=false (наприклад, після «OK»). onClose кличемо лише тоді, коли вікно закрив браузер (Esc), а проп ще open.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cn("ui-dialog w-full", SIZES[size], className)}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onClick={(event) => {
        if (role === "dialog" && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
      {/* Після змісту: перший фокус при showModal() — поле форми, а не «Close». */}
      {closable && role === "dialog" ? (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-sm text-muted-foreground transition-ui hover:bg-state-hover hover:text-foreground press"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </dialog>
  );
}

/** Шапка вікна: іконка-тон (за потреби), заголовок і рядок наслідку. */
export function DialogHeader({
  icon,
  tone = "default",
  title,
  titleId,
  description,
  descriptionId,
  children,
}: {
  icon?: ReactNode;
  tone?: "default" | "destructive";
  title: ReactNode;
  titleId: string;
  description?: ReactNode;
  descriptionId?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ui-dialog-head flex flex-col gap-4 px-6 pb-5 pt-6">
      <div className="flex items-start gap-4 pr-8">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "ui-dialog-icon grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5",
              tone === "destructive" ? "bg-destructive-tint text-destructive" : "bg-primary-tint text-primary",
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1.5 pt-0.5">
          <h2 id={titleId} className="text-title break-words">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-body text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Нижня смуга з діями: на телефоні кнопки на всю ширину, основна дія — нижня (під великим пальцем). */
export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Підтвердження дії без відкату: заголовок (що саме) і наслідок («This cannot be undone») видно одразу; фокус — на
 * підтвердженні. `tone="destructive"` — для видалення: червона кнопка й іконка кошика; `default` — для завершальних
 * дій (позначити останню обов'язкову задачу).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const confirm = useRef<HTMLButtonElement>(null);
  // showModal() фокусує першу кнопку («Cancel»); для узгодженості з DESIGN.md переносимо фокус на підтвердження.
  useEffect(() => {
    if (open) confirm.current?.focus();
  }, [open]);
  return (
    <Dialog open={open} onClose={onCancel} role="alertdialog" size="sm" labelledBy={`${id}-title`} describedBy={`${id}-desc`}>
      <DialogHeader
        icon={tone === "destructive" ? <TrashIcon /> : <CheckIcon />}
        tone={tone}
        title={title}
        titleId={`${id}-title`}
        description={description}
        descriptionId={`${id}-desc`}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="gap-2">
          {cancelLabel}
          <kbd className="hidden rounded-xs border border-border bg-muted px-1 font-sans text-[11px] leading-4 text-muted-foreground sm:inline">Esc</kbd>
        </Button>
        <Button ref={confirm} variant={tone === "destructive" ? "destructive" : "default"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
