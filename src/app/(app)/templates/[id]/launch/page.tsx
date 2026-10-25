import { notFound } from "next/navigation";
import { errorMessage } from "@/lib/runs/messages";
import { requireViewer } from "@/lib/supabase/viewer";
import { Notice, PageShell } from "@/app/_components/ui";
import { launchRun } from "../../../runs/actions";
import { LaunchForm } from "./_components/launch-form";

// AC-RUN-01, AC-RUN-03, AC-RUN-04, AC-RUN-07…09: назва випадку і виконавець кожної задачі
// (за замовчуванням — той, хто запускає; він же менеджер запуску).
export default async function LaunchTemplatePage({ params, searchParams }: PageProps<"/templates/[id]/launch">) {
  const [{ id }, { error, case_name }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();

  const { data: template } = await supabase.from("templates").select("id, name").eq("id", id).maybeSingle();
  if (!template) notFound();

  const [{ data: sections }, { data: users }] = await Promise.all([
    supabase.from("template_sections").select("id, name, position").eq("template_id", id).order("position"),
    // Робоче припущення Q1: у списку — лише email менеджерів і адміністраторів.
    supabase.rpc("list_assignable_users"),
  ]);
  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: tasks } = sectionIds.length
    ? await supabase.from("template_tasks").select("id, section_id, name, required, position").in("section_id", sectionIds).order("position")
    : { data: [] };
  const others = (users ?? []).filter((u) => u.id !== viewer.id);
  const message = errorMessage(error);

  return (
    <PageShell
      title={`Launch “${template.name}”`}
    >
      {message ? <Notice kind="error">{message}</Notice> : null}
      <LaunchForm
        templateId={template.id}
        templateName={template.name}
        sections={sections ?? []}
        tasks={tasks ?? []}
        viewer={viewer}
        others={others}
        caseName={typeof case_name === "string" ? case_name : ""}
        action={launchRun}
      />
    </PageShell>
  );
}
