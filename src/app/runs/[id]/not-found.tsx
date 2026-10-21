import Link from "next/link";
import { MESSAGES } from "@/lib/runs/messages";

// AC-TASK-10: запуск, якого RLS не віддає (чужий або неіснуючий), — «Run not found» і жодної задачі.
// Сторінка запуску викликає notFound(), Next.js відповідає 404 і показує цей сегмент.
export default function RunNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold" data-testid="run-not-found">
        {MESSAGES.RUN_NOT_FOUND}
      </h1>
      <Link href="/runs" className="text-sm underline">
        Back to runs
      </Link>
    </main>
  );
}
