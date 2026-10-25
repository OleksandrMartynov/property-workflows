import { notFound } from "next/navigation";
import { errorMessage } from "@/lib/runs/messages";
import { loadCurrentVersions, loadVersionTasks, toLaunchSections } from "@/lib/templates/current";
import { requireViewer } from "@/lib/supabase/viewer";
import { Notice, PageShell } from "@/app/_components/ui";
import { launchRun } from "../../../runs/actions";
import { LaunchForm } from "./_components/launch-form";

// AC-RUN-01, AC-RUN-03, AC-RUN-04, AC-RUN-07…09: назва випадку і виконавець кожної задачі
// (за замовчуванням — той, хто запускає; він же менеджер запуску).
export default async function LaunchTemplatePage({ params, searchParams }: PageProps<"/templates/[id]/launch">) {
  const [{ id }, { error, case_name }] = await Promise.all([params, searchParams]);
  const { supabase, viewer } = await requireViewer();

  // Запускаємо лише поточну версію (AC-EDITOR-06): назва, секції й задачі — зі знімка версії, не з незбережених змін.
  const [template] = await loadCurrentVersions(supabase, [id]);
  if (!template) notFound();

  const [versionTasks, { data: users }] = await Promise.all([
    loadVersionTasks(supabase, [template.versionId]),
    // Робоче припущення Q1: у списку — лише email менеджерів і адміністраторів.
    supabase.rpc("list_assignable_users"),
  ]);
  const { sections, tasks } = toLaunchSections(versionTasks);
  const others = (users ?? []).filter((u) => u.id !== viewer.id);
  const message = errorMessage(error);

  return (
    <PageShell
      title={`Launch “${template.name}”`}
    >
      {message ? <Notice kind="error">{message}</Notice> : null}
      <LaunchForm
        templateId={template.templateId}
        templateName={template.name}
        sections={sections}
        tasks={tasks}
        viewer={viewer}
        others={others}
        caseName={typeof case_name === "string" ? case_name : ""}
        action={launchRun}
      />
    </PageShell>
  );
}
