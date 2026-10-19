"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectAssignees } from "@/lib/runs/assignees";
import { validateCaseName } from "@/lib/runs/case-name";
import { dbErrorCode } from "@/lib/runs/messages";
import { requireViewer } from "@/lib/supabase/viewer";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** AC-RUN-01…09: запуск шаблону для випадку. Запуск і копія задач — однією функцією бази launch_run. */
export async function launchRun(formData: FormData) {
  const { supabase, viewer } = await requireViewer();
  const templateId = text(formData, "template_id");
  const rawCaseName = text(formData, "case_name");
  const back = (code: string) =>
    `/templates/${encodeURIComponent(templateId)}/launch?error=${code}&case_name=${encodeURIComponent(rawCaseName.slice(0, 200))}`;

  // AC-RUN-03, AC-RUN-07: при помилці до бази не доходимо — запуску немає.
  const caseName = validateCaseName(rawCaseName);
  if (!caseName.ok) redirect(back(caseName.error));

  // Задачі шаблону — щоб узяти з форми лише їхні поля виконавців (AC-RUN-04, AC-RUN-08, AC-RUN-09).
  // Помилка цих запитів — не запускаємо: інакше launch_run поставив би всі задачі на менеджера запуску.
  const { data: sections, error: sectionsError } = await supabase
    .from("template_sections")
    .select("id")
    .eq("template_id", templateId);
  if (sectionsError) redirect(back(dbErrorCode(sectionsError)));
  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: tasks, error: tasksError } = sectionIds.length
    ? await supabase.from("template_tasks").select("id").in("section_id", sectionIds)
    : { data: [] as { id: string }[], error: null };
  if (tasksError) redirect(back(dbErrorCode(tasksError)));
  const assignees = collectAssignees(formData, (tasks ?? []).map((t) => t.id), viewer.id);

  const { data: runId, error } = await supabase.rpc("launch_run", {
    p_template_id: templateId,
    p_case_name: caseName.value,
    p_assignees: assignees,
  });
  if (error || !runId) redirect(back(dbErrorCode(error)));

  revalidatePath("/runs");
  redirect(`/runs/${runId}?done=launched`);
}

/** AC-TASK-01…04, AC-TASK-07: позначка задачі виконаною. Права й завершення запуску перевіряє функція complete_task. */
export async function completeTask(formData: FormData) {
  const { supabase } = await requireViewer();
  const runId = text(formData, "run_id");
  const taskId = text(formData, "task_id");

  const { error } = await supabase.rpc("complete_task", { p_task_id: taskId });
  // AC-TASK-03: задача лишається «to do», а користувач бачить текст PM.
  if (error) redirect(`/runs/${encodeURIComponent(runId)}?error=${dbErrorCode(error)}`);

  revalidatePath("/runs");
  revalidatePath(`/runs/${runId}`);
  redirect(`/runs/${encodeURIComponent(runId)}`);
}
