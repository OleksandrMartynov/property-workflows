import { countVersion, loadCurrentVersions, loadVersionTasks } from "@/lib/templates/current";
import { requireViewer } from "@/lib/supabase/viewer";
import { PageShell } from "@/app/_components/ui";
import { TemplatesList, type TemplateCounts } from "./_components/templates-list";

// Шаблони (матриця прав «See templates»): поточні версії збережених шаблонів (AC-EDITOR-02).
export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { supabase } = await requireViewer();
  // Поточна версія кожного шаблону (AC-EDITOR-02): назва й склад — зі знімка версії, а не з незбережених змін.
  const current = await loadCurrentVersions(supabase);
  const tasks = await loadVersionTasks(
    supabase,
    current.map((v) => v.versionId),
  );
  const templates = current.map((v) => ({ id: v.templateId, name: v.name }));
  const counts = new Map<string, TemplateCounts>(
    current.map((v) => [v.templateId, countVersion(tasks.filter((t) => t.version_id === v.versionId))]),
  );

  return (
    <PageShell title="Templates">
      <TemplatesList templates={templates} counts={Object.fromEntries(counts)} />
    </PageShell>
  );
}
