import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MESSAGES } from "@/lib/runs/messages";

// AC-TASK-10: запуск, якого RLS не віддає (чужий або неіснуючий), — «Run not found» і жодної задачі.
// Сторінка запуску викликає notFound(), Next.js відповідає 404 і показує цей сегмент усередині AppShell групи (app):
// <main> і логотип уже дає каркас, тож тут лише вміст (без вкладеного <main> і другого логотипа).
export default function RunNotFound() {
  return (
    <div className="flex flex-col gap-8">
      <EmptyState
        title={<span data-testid="run-not-found">{MESSAGES.RUN_NOT_FOUND}</span>}
        action={
          <Link href="/runs" className={buttonVariants({ variant: "outline" })}>
            Back to runs
          </Link>
        }
      />
    </div>
  );
}
