import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MESSAGES } from "@/lib/runs/messages";

// AC-EDITOR-16: шаблон, якого немає для користувача (ніколи не збережений як версія — менеджеру RLS його не віддає, або
// неіснуючий), — «Template not found» і жодної секції чи задачі. Сторінки шаблону викликають notFound(); сегмент
// показується всередині AppShell групи (app): <main> і логотип уже дає каркас, тож тут лише вміст.
export default function TemplateNotFound() {
  return (
    <div className="flex flex-col gap-8">
      <EmptyState
        title={<span data-testid="template-not-found">{MESSAGES.TEMPLATE_NOT_FOUND}</span>}
        action={
          <Link href="/templates" className={buttonVariants({ variant: "outline" })}>
            Back to templates
          </Link>
        }
      />
    </div>
  );
}
