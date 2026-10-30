import { notFound } from "next/navigation";
import { errorMessage } from "@/lib/runs/messages";
import { canManageTemplates, requireViewer } from "@/lib/supabase/viewer";
import { loadCurrentVersions, loadVersionTasks } from "@/lib/templates/current";
import { Forbidden } from "@/app/_components/forbidden";
import { EditorView } from "./_components/editor-view";

// Редактор шаблону (адміністратор): сторінка читає незбережені зміни, поточну версію й автора збереження, вигляд —
// EditorView. Кожна зміна зберігається одразу (AC-EDITOR-01); «Save» створює версію (AC-EDITOR-03, AC-EDITOR-04).
// Менеджер бачить лише «Not enough rights» без вмісту редактора й без жодного запиту (AC-DSYS-02); відвідувача без
// входу proxy веде на /login (AC-EDITOR-09).
export const metadata = { title: "Edit template" };

export default async function EditTemplatePage({ params, searchParams }: PageProps<"/templates/[id]/edit">) {
  const [{ id }, { error, saved, view }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();
  // Перевірка ролі — до будь-якого запиту незбережених змін.
  if (!canManageTemplates(viewer.role)) return <Forbidden title="Edit template" role={viewer.role} />;

  const { data: drafts, error: draftsError } = await supabase.rpc("list_template_drafts");
  if (draftsError) throw draftsError;
  const template = (drafts ?? []).find((d) => d.id === id);
  if (!template) notFound();

  const { data: sectionRows, error: sectionsError } = await supabase
    .from("template_sections")
    .select("id, name, position")
    .eq("template_id", id)
    .order("position");
  if (sectionsError) throw sectionsError;
  const sections = sectionRows ?? [];
  const sectionIds = sections.map((s) => s.id);
  const { data: taskRows, error: tasksError } = sectionIds.length
    ? await supabase.from("template_tasks").select("id, section_id, name, required, position").in("section_id", sectionIds).order("position")
    : { data: [] as { id: string; section_id: string; name: string; required: boolean; position: number }[], error: null };
  if (tasksError) throw tasksError;
  const tasks = taskRows ?? [];

  // Поточна версія: з чим порівнювати незбережені зміни, коли й ким її збережено.
  const [current] = template.current_version === null ? [] : await loadCurrentVersions(supabase, [id]);
  const versionTasks = current ? await loadVersionTasks(supabase, [current.versionId]) : null;
  const { data: latest } = current
    ? await supabase.from("template_versions").select("saved_at, saved_by").eq("id", current.versionId).maybeSingle()
    : { data: null };
  const { data: author } = latest?.saved_by
    ? await supabase.from("profiles").select("email").eq("id", latest.saved_by).maybeSingle()
    : { data: null };

  return (
    <EditorView
      template={template}
      sections={sections}
      tasks={tasks}
      current={current ? { number: current.number } : null}
      versionTasks={versionTasks}
      latest={latest}
      authorEmail={author?.email ?? null}
      message={errorMessage(error)}
      savedNumber={typeof saved === "string" && /^\d+$/.test(saved) ? saved : null}
      mode={view === "preview" ? "preview" : "edit"}
    />
  );
}
