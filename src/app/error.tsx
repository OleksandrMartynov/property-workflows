"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/ui/logo";
import { MESSAGES } from "@/lib/runs/messages";

// Непередбачена помилка сторінки: текст дослівно з вимог («Something went wrong. Try again.») і кнопка повтору.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <Logo />
      <EmptyState
        title={MESSAGES.DB_ERROR}
        action={
          <Button variant="default" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
