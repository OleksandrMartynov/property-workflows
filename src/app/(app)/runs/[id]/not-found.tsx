import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/ui/logo";
import { MESSAGES } from "@/lib/runs/messages";

// AC-TASK-10: запуск, якого RLS не віддає (чужий або неіснуючий), — «Run not found» і жодної задачі.
// Сторінка запуску викликає notFound(), Next.js відповідає 404 і показує цей сегмент.
export default function RunNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <Link href="/" className="no-underline">
        <Logo />
      </Link>
      <EmptyState
        title={<span data-testid="run-not-found">{MESSAGES.RUN_NOT_FOUND}</span>}
        action={
          <Link href="/runs" className={buttonVariants({ variant: "outline" })}>
            Back to runs
          </Link>
        }
      />
    </main>
  );
}
