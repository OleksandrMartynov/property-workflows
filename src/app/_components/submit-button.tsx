"use client";

// Кнопка надсилання форми: поки server action виконується, кнопка вимкнена й показує pendingText —
// повторне натискання не надішле форму вдруге (рев'ю CodeRabbit у PR #6: подвійний клік «Launch» давав два запуски).
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
