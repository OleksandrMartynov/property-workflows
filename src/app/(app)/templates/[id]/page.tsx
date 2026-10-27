import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PlayIcon } from "@/components/ui/icons";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { findTemplateDraft, isUuid, loadCurrentVersions, loadVersionTasks } from "@/lib/templates/current";
import { PageShell } from "@/app/_components/ui";
import { TemplateView } from "./_components/template-view";

// Сторінка шаблону лише для читання (AC-EDITOR-02): назва, «Version N», секції із задачами («required» / «optional») і
// «Launch» — тільки поточна версія. Менеджеру база не віддає ні незбережених змін, ні старих версій, ні шаблону без
// збереженої версії (RLS, ADR 0006): такий шаблон — «Template not found» без жодної секції чи задачі (AC-EDITOR-16).
export const metadata = { title: "Template" };

export default async function TemplatePage({ params }: PageProps<"/templates/[id]">) {
  const [{ id }, { supabase, viewer }] = await Promise.all([params, requireViewer()]);
  if (!isUuid(id)) notFound();

  const [current] = await loadCurrentVersions(supabase, [id]);
  if (!current) {
    // Адміністратор ще не збереженого шаблону працює в редакторі; менеджер — «Template not found».
    if (canManageTemplates(viewer.role)) {
      if (await findTemplateDraft(supabase, id)) redirect(`/templates/${id}/edit`);
    }
    notFound();
  }

  const tasks = await loadVersionTasks(supabase, [current.versionId]);

  return (
    <PageShell
      title={current.name}
      back={{ href: "/templates", label: "Templates" }}
      description={
        <Badge variant="outline" className="tabular">
          {`Version ${current.number}`}
        </Badge>
      }
      actions={
        <Link href={`/templates/${id}/launch`} className={buttonVariants({ variant: "default" })}>
          <PlayIcon />
          Launch
        </Link>
      }
    >
      <TemplateView tasks={tasks} />
    </PageShell>
  );
}
