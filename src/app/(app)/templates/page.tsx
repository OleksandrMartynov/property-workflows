import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { countVersion, loadCurrentVersions, loadVersionTasks } from "@/lib/templates/current";
import { PageShell } from "@/app/_components/ui";
import { TemplatesList, type TemplateCounts, type TemplateRow } from "./_components/templates-list";

// Шаблони (матриця прав «See templates»): менеджер — лише збережені шаблони в поточній версії (AC-EDITOR-02);
// адміністратор — усі, зокрема з незбереженими змінами й ще не збережені (AC-EDITOR-01, AC-EDITOR-04).
export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { supabase, viewer } = await requireViewer();
  const canManage = canManageTemplates(viewer.role);

  // Поточна версія кожного шаблону: назва й склад — зі знімка версії, а не з незбережених змін.
  const current = await loadCurrentVersions(supabase);
  const tasks = await loadVersionTasks(
    supabase,
    current.map((v) => v.versionId),
  );
  const counts = new Map<string, TemplateCounts>(
    current.map((v) => [v.templateId, countVersion(tasks.filter((t) => t.version_id === v.versionId))]),
  );

  let templates: TemplateRow[] = current.map((v) => ({ id: v.templateId, name: v.name, currentVersion: v.number }));
  if (canManage) {
    // Адміністратор бачить назву з незбережених змін і позначку (функція бази перевіряє роль сама).
    const { data: drafts, error } = await supabase.rpc("list_template_drafts");
    if (error) throw error;
    templates = (drafts ?? []).map((d) => ({ id: d.id, name: d.name, currentVersion: d.current_version, unpublished: d.has_unpublished_changes }));
  }

  return (
    <PageShell
      title="Templates"
      actions={
        canManage ? (
          <Link href="/templates/new" className={buttonVariants({ variant: "default" })}>
            New template
          </Link>
        ) : undefined
      }
    >
      <TemplatesList templates={templates} counts={Object.fromEntries(counts)} canManage={canManage} />
    </PageShell>
  );
}
