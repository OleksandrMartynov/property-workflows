import { notFound } from "next/navigation";
import { assigneeField } from "@/lib/runs/assignees";
import { errorMessage, CASE_NAME_MAX_LENGTH } from "@/lib/runs/messages";
import { requireViewer } from "@/lib/supabase/viewer";
import { Notice, PageShell, buttonClass, inputClass } from "../../../_components/ui";
import { launchRun } from "../../../runs/actions";

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
    <PageShell title={`Launch “${template.name}”`} email={viewer.email} role={viewer.role}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      <form action={launchRun} className="flex flex-col gap-6" noValidate>
        <input type="hidden" name="template_id" value={template.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Case name</span>
          <input
            name="case_name"
            className={inputClass}
            placeholder="Apartment 12, move-in"
            defaultValue={typeof case_name === "string" ? case_name : ""}
            aria-describedby="case_name-hint"
          />
          <span id="case_name-hint" className="text-zinc-500">
            1–{CASE_NAME_MAX_LENGTH} characters. You become the run manager.
          </span>
        </label>

        {(sections ?? []).map((section) => (
          <fieldset key={section.id} className="flex flex-col gap-3">
            <legend className="mb-2 font-medium">{section.name}</legend>
            {(tasks ?? [])
              .filter((t) => t.section_id === section.id)
              .map((task) => (
                <label key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {task.name}
                    <span className="ml-2 text-xs text-zinc-500">{task.required ? "required" : "optional"}</span>
                  </span>
                  <select name={assigneeField(task.id)} defaultValue={viewer.id} className={inputClass} aria-label={`Assignee of ${task.name}`}>
                    <option value={viewer.id}>{viewer.email ?? "me"} (me, run manager)</option>
                    {others.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </fieldset>
        ))}

        <button type="submit" className={`${buttonClass} self-start`}>
          Launch
        </button>
      </form>
    </PageShell>
  );
}
