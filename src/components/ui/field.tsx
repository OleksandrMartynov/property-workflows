"use client";

import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./controls.css";
import { Label } from "./label";

function AlertGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.8v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** Що поле-нащадок бере з `Field`: id, зв'язок із підказкою/помилкою, стан помилки й обов'язковості. */
export interface FieldControlContext {
  id: string;
  invalid: boolean;
  required: boolean;
  describedBy: string | undefined;
}
const FieldContext = createContext<FieldControlContext | null>(null);

/** Для `Input`, `Textarea` та інших контролів: якщо вони всередині `Field`, id і aria-* підставляються самі (явні пропси сильніші). */
export function useFieldControl(): FieldControlContext | null {
  return useContext(FieldContext);
}

/**
 * Підказка й помилка ділять одну клітинку сітки: текст перетікає (cross-fade) без стрибка макета, а поле без підказки
 * розкриває рядок помилки пружиною. Помилка — `role="alert"`; текст лишається на час зникання й потім очищується,
 * щоб повторна та сама помилка озвучувалась знову.
 */
export function FieldMessage({ id, hint, error }: { id: string; hint?: ReactNode; error?: ReactNode }) {
  const errorText = typeof error === "string" ? error : null;
  const [lastText, setLastText] = useState<string | null>(errorText);
  if (errorText && errorText !== lastText) setLastText(errorText);
  const hasError = Boolean(error);

  useEffect(() => {
    if (hasError) return;
    const timer = setTimeout(() => setLastText(null), 420);
    return () => clearTimeout(timer);
  }, [hasError]);

  return (
    <div className="ctl-msg" data-open={hint || hasError ? "" : undefined} data-invalid={hasError ? "" : undefined}>
      {hint ? (
        <p id={`${id}-hint`} className="ctl-hint">
          {hint}
        </p>
      ) : null}
      <p id={`${id}-error`} role="alert" aria-hidden={hasError ? undefined : true} className="ctl-error">
        <AlertGlyph />
        <span className="min-w-0">{error || lastText}</span>
      </p>
    </div>
  );
}

/** Лічильник символів: табулярні цифри, бурштин від 90 % ліміту, червоний після нього. */
export function FieldCounter({ count, max }: { count: number; max: number }) {
  const state = count > max ? "over" : count >= max * 0.9 ? "near" : undefined;
  return (
    <span className="ctl-counter" data-state={state} aria-hidden="true">
      {count}/{max}
    </span>
  );
}

/**
 * Підпис + поле + підказка/помилка + (за потреби) лічильник символів.
 * - Нащадки (`Input`, `Textarea`, `PasswordInput`…) беруть `id`, `aria-describedby`, `aria-invalid` і `aria-required` із контексту.
 * - `required` додає зірочку (лише візуально; сам атрибут — на полі), `optional` — «Optional» праворуч від підпису.
 * - `counter` — максимум символів; рахує значення нащадка (`input`/`textarea`) і підсвічує ліміт, але сам його не накладає.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  optional,
  counter,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  counter?: number;
  className?: string;
  children: ReactNode;
}) {
  const [count, setCount] = useState(0);
  const invalid = Boolean(error);
  const describedBy = [hint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  const readCount = useCallback((el: HTMLElement | null) => {
    const control = el?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (control) setCount(control.value.length);
  }, []);
  const onInput = (event: FormEvent<HTMLDivElement>) => {
    if (counter && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) setCount(event.target.value.length);
  };

  return (
    <FieldContext.Provider value={{ id, invalid, required: Boolean(required), describedBy }}>
      <div className={cn("flex min-w-0 flex-col", className)} data-invalid={invalid ? "" : undefined}>
        <div className="mb-1.5 flex min-h-[18px] items-center justify-between gap-3">
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
          {optional ? <span className="text-meta text-muted-foreground">Optional</span> : null}
        </div>
        <div ref={counter ? readCount : undefined} onInput={onInput} className="flex flex-col gap-1.5">
          {children}
        </div>
        <div className="ctl-foot">
          <FieldMessage id={id} hint={hint} error={error} />
          {counter ? <FieldCounter count={count} max={counter} /> : null}
        </div>
      </div>
    </FieldContext.Provider>
  );
}
