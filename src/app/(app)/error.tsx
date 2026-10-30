"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MESSAGES } from "@/lib/runs/messages";

// Непередбачена помилка сторінки застосунку — у каркасі (бічна панель і пошук лишаються, людина не губить дорогу):
// текст дослівно з вимог («Something went wrong. Try again.») і кнопка повтору. Кореневий src/app/error.tsx — для
// сторінок поза каркасом.
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      title={MESSAGES.DB_ERROR}
      action={
        <Button variant="default" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
