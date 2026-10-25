"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Модальне вікно на нативному <dialog>: фокус-пастка, Esc і inert-фон дає браузер, вхід і вихід — CSS (.ui-dialog).
 * `alertdialog` не закривається кліком повз вікно: на запитанні, що не має відкату, відповідь — лише кнопкою.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
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
      className={cn("ui-dialog w-full max-w-md", className)}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onClick={(event) => {
        if (role === "dialog" && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

/** Підтвердження дії без відкату: заголовок і наслідок видно одразу, основна дія — OK, безпечна — Cancel. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
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
    <Dialog open={open} onClose={onCancel} role="alertdialog" labelledBy={`${id}-title`} describedBy={`${id}-desc`}>
      <div className="flex flex-col gap-1.5 p-5 pb-4">
        <h2 id={`${id}-title`} className="text-title">
          {title}
        </h2>
        <p id={`${id}-desc`} className="text-body text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button ref={confirm} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
