import { requireViewer } from "@/lib/supabase/viewer";
import { PageShell } from "@/app/_components/ui";
import { TemplatesList, type TemplateCounts } from "./_components/templates-list";

// Шаблони (матриця прав «See templates»: manager і admin). Екрана редагування в зрізі немає (Non-goals).
export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { supabase } = await requireViewer();
  const [{ data: templates }, { data: sections }, { data: tasks }] = await Promise.all([
    supabase.from("templates").select("id, name").order("name"),
    supabase.from("template_sections").select("id, template_id"),
    supabase.from("template_tasks").select("id, section_id, required"),
  ]);
  const templateOf = new Map((sections ?? []).map((s) => [s.id, s.template_id]));
  const counts = new Map<string, TemplateCounts>();
  for (const s of sections ?? []) {
    const c = counts.get(s.template_id) ?? { total: 0, required: 0, sections: 0 };
    c.sections += 1;
    counts.set(s.template_id, c);
  }
  for (const t of tasks ?? []) {
    const c = counts.get(templateOf.get(t.section_id) ?? "");
    if (!c) continue;
    c.total += 1;
    if (t.required) c.required += 1;
  }

  return (
    <PageShell title="Templates">
      <TemplatesList templates={templates ?? []} counts={Object.fromEntries(counts)} />
    </PageShell>
  );
}
