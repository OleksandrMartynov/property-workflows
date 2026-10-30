import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { TemplateIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/runs/messages";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { Forbidden } from "@/app/_components/forbidden";
import { SubmitButton } from "@/app/_components/submit-button";
import { PageShell } from "@/app/_components/ui";
import { createTemplate } from "../[id]/edit/actions";

// Новий шаблон (адміністратор): назва → редактор. Зазвичай відкривається діалогом у галереї шаблонів; сторінка — для
// прямого посилання й помилки сервера (?error=…). Шаблон без збереженої версії менеджери не бачать (AC-EDITOR-02).
export const metadata = { title: "New template" };

export default async function NewTemplatePage({ searchParams }: PageProps<"/templates/new">) {
  const [{ viewer }, { error }] = await Promise.all([requireViewer(), searchParams]);
  if (!canManageTemplates(viewer.role)) return <Forbidden title="New template" role={viewer.role} />;
  const message = errorMessage(error);

  return (
    <PageShell title="New template" back={{ href: "/templates", label: "Templates" }}>
      <Card className="w-full max-w-lg animate-ui-rise">
        <form action={createTemplate} noValidate>
          <div className="flex flex-col gap-5 p-5">
            <span className="grid size-9 place-items-center rounded-md bg-state-selected text-primary" aria-hidden="true">
              <TemplateIcon />
            </span>
            <Field id="template_name" label="Template name" error={message}>
              <Input name="name" size="lg" autoFocus autoComplete="off" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">
            <Link href="/templates" className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            <SubmitButton pendingText="Creating…">Create</SubmitButton>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
