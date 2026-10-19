import Link from "next/link";
import { requireViewer } from "@/lib/supabase/viewer";
import { PageShell } from "../_components/ui";

// Шаблони (матриця прав «See templates»: manager і admin). Екрана редагування в зрізі немає (Non-goals).
export default async function TemplatesPage() {
  const { supabase, viewer } = await requireViewer();
  const [{ data: templates }, { data: sections }, { data: tasks }] = await Promise.all([
    supabase.from("templates").select("id, name").order("name"),
    supabase.from("template_sections").select("id, template_id"),
    supabase.from("template_tasks").select("id, section_id, required"),
  ]);
  const templateOf = new Map((sections ?? []).map((s) => [s.id, s.template_id]));
  const counts = new Map<string, { total: number; required: number; sections: number }>();
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
    <PageShell title="Templates" email={viewer.email} role={viewer.role}>
      {!templates?.length ? (
        <p className="text-sm text-zinc-500">No templates yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => {
            const c = counts.get(t.id);
            return (
              <li key={t.id} className="flex items-center justify-between gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-zinc-500">
                    {c?.sections ?? 0} sections · {c?.total ?? 0} tasks, {c?.required ?? 0} required
                  </p>
                </div>
                <Link href={`/templates/${t.id}/launch`} className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background">
                  Launch
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
