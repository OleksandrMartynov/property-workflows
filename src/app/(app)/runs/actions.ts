"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectAssignees } from "@/lib/runs/assignees";
import { validateCaseName } from "@/lib/runs/case-name";
import { dbErrorCode, isMissingRpcSignature } from "@/lib/runs/messages";
import { loadCurrentVersions, loadVersionTasks } from "@/lib/templates/current";
import { requireViewer } from "@/lib/supabase/viewer";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Задачі поточної версії — щоб узяти з форми лише їхні поля виконавців (AC-RUN-04, AC-RUN-08, AC-RUN-09,
  // AC-EDITOR-06). Ключ — template_task_id знімка версії. Помилка цих запитів — не запускаємо: інакше launch_run
  // поставив би всі задачі на менеджера запуску.
  let taskIds: string[];
  try {
    const [current] = await loadCurrentVersions(supabase, [templateId]);
    taskIds = current ? (await loadVersionTasks(supabase, [current.versionId])).map((t) => t.template_task_id) : [];
  } catch (error) {
    redirect(back(dbErrorCode(error as { message?: string })));
  }
  const assignees = collectAssignees(formData, taskIds, viewer.id);

  const { data: runId, error } = await supabase.rpc("launch_run", {
    p_template_id: templateId,
    p_case_name: caseName.value,
    p_assignees: assignees,
  });
  if (error || !runId) redirect(back(dbErrorCode(error)));

  revalidatePath("/runs");
  redirect(`/runs/${runId}?done=launched`);
}

/**
 * AC-TASK-01…04, AC-TASK-07, AC-TASK-16: позначка задачі виконаною. Права, підтвердження останньої обов'язкової задачі
 * (CONFIRMATION_REQUIRED) і завершення запуску перевіряє функція complete_task.
 */
export async function completeTask(formData: FormData) {
  const { supabase } = await requireViewer();
  const runId = text(formData, "run_id");
  const taskId = text(formData, "task_id");
  // Некоректні id з форми — до бази не йдемо (інакше Postgres дав би загальну помилку замість TASK_NOT_FOUND).
  if (!UUID_RE.test(runId)) redirect("/runs");
  if (!UUID_RE.test(taskId)) redirect(`/runs/${runId}?error=TASK_NOT_FOUND`);

  // confirmed=yes додає лише підтверджена дія останньої обов'язкової задачі (withConfirmation у MarkDoneForm).
  // p_confirmed передаємо лише як true: звичайна позначка не залежить від нового параметра функції бази.
  const confirmed = text(formData, "confirmed") === "yes";
  let { error } = await supabase.rpc("complete_task", { p_task_id: taskId, ...(confirmed ? { p_confirmed: true } : {}) });
  // ADR 0003: база ще без p_confirmed (застосунок задеплоєно раніше за міграцію або базу не оновлено) — PostgREST не
  // знаходить сигнатуру. Користувач уже підтвердив у діалозі, тож повторюємо виклик старою сигнатурою.
  if (error && confirmed && isMissingRpcSignature(error)) ({ error } = await supabase.rpc("complete_task", { p_task_id: taskId }));
  // AC-TASK-03: задача лишається «to do», а користувач бачить текст PM.
  if (error) redirect(`/runs/${encodeURIComponent(runId)}?error=${dbErrorCode(error)}`);

  revalidatePath("/runs");
  revalidatePath(`/runs/${runId}`);
  redirect(`/runs/${encodeURIComponent(runId)}`);
}
