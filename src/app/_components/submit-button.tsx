"use client";

// Кнопка надсилання форми: поки server action виконується, кнопка вимкнена й показує pendingText —
// повторне натискання не надішле форму вдруге (рев'ю CodeRabbit у PR #6: подвійний клік «Launch» давав два запуски).
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: Omit<ComponentProps<typeof Button>, "type" | "loading"> & { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} aria-disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
