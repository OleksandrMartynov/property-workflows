import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/runs/messages";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { Forbidden } from "@/app/_components/forbidden";
import { SubmitButton } from "@/app/_components/submit-button";
import { Notice, PageShell } from "@/app/_components/ui";
import { createTemplate } from "../[id]/edit/actions";

// Новий шаблон (адміністратор): назва → редактор. Шаблон без збереженої версії менеджери не бачать (AC-EDITOR-02).
export const metadata = { title: "New template" };

export default async function NewTemplatePage({ searchParams }: PageProps<"/templates/new">) {
  const [{ viewer }, { error }] = await Promise.all([requireViewer(), searchParams]);
  if (!canManageTemplates(viewer.role)) return <Forbidden title="New template" />;
  const message = errorMessage(error);

  return (
    <PageShell title="New template" back={{ href: "/templates", label: "Templates" }}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      <form action={createTemplate} className="flex max-w-md flex-col gap-4">
        <Field id="template_name" label="Template name">
          <Input name="name" required autoComplete="off" />
        </Field>
        <SubmitButton pendingText="Creating…" className="self-start">
          Create
        </SubmitButton>
      </form>
    </PageShell>
  );
}
