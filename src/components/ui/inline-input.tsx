"use client";

import { useRef, type ComponentProps, type KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { Spinner } from "./button";

const sizes = {
  title: "h-9 text-title",
  heading: "h-8 text-heading",
  body: "h-8 text-body",
} as const;

/**
 * Поле, що виглядає як текст: назва шаблону, секції чи задачі редагується на місці. Межа й тло з'являються під
 * курсором і у фокусі (межа `ring`, як у `Input`). Enter або втрата фокусу надсилають форму, якщо текст змінився;
 * Esc повертає збережене значення; порожнє значення не надсилається — повертається попереднє. З `commit="enter"`
 * (рядок «Add a task») форма йде лише за Enter, а втрата фокусу нічого не надсилає. Поки форма надсилається —
 * спінер справа й `aria-busy`.
 */
export function InlineInput({
  size = "body",
  commit = "blur",
  className,
  containerClassName,
  tone = "default",
  defaultValue,
  onKeyDown,
  onBlur,
  ref,
  ...props
}: Omit<ComponentProps<"input">, "size" | "type"> & {
  size?: keyof typeof sizes;
  /** "blur" — зберегти за Enter і втратою фокусу; "enter" — лише за Enter (поле нового елемента). */
  commit?: "blur" | "enter";
  /** Класи обгортки (ширина в рядку: `basis-48`), `className` — самого поля. */
  containerClassName?: string;
  /** "accent" — плейсхолдер кольору `primary` (рядок «Add a task»: місце дії видно одразу). */
  tone?: "default" | "accent";
}) {
  const own = useRef<HTMLInputElement>(null);
  const { pending } = useFormStatus();
  const saved = String(defaultValue ?? "");

  const setRefs = (el: HTMLInputElement | null) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const submitIfChanged = (el: HTMLInputElement) => {
    const value = el.value.trim();
    if (!value) {
      el.value = saved;
      return false;
    }
    if (value === saved.trim()) return false;
    el.form?.requestSubmit();
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const el = event.currentTarget;
    if (event.key === "Enter") {
      event.preventDefault();
      if (!submitIfChanged(el) && commit === "blur") el.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      el.value = saved;
      el.blur();
    }
  };

  return (
    <span className={cn("relative flex min-w-0 flex-1", containerClassName)}>
      <input
        ref={setRefs}
        type="text"
        defaultValue={defaultValue}
        autoComplete="off"
        aria-busy={pending || undefined}
        className={cn(
          "w-full min-w-0 rounded-sm border border-transparent bg-transparent px-2 text-foreground caret-primary transition-ui hover:border-input hover:bg-field focus-visible:border-ring focus-visible:bg-field focus-visible:-outline-offset-1",
          sizes[size],
          tone === "accent" ? "placeholder:font-medium placeholder:text-primary" : "placeholder:text-muted-foreground",
          pending && "pr-8",
          className,
        )}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          onBlur?.(event);
          if (commit === "blur") submitIfChanged(event.currentTarget);
        }}
        {...props}
      />
      {pending ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
          <Spinner />
        </span>
      ) : null}
    </span>
  );
}
