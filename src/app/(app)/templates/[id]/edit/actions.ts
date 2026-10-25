"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorCode } from "@/lib/runs/messages";
import { requireAdmin } from "@/lib/supabase/viewer";
import { cleanName, nextPosition, swapWithNeighbour } from "@/lib/templates/editor";

// Дії редактора шаблону (зріз 2, задача 2): кожна — публічний POST-ендпойнт, тож першим кроком requireAdmin()
// (getClaims() + роль admin із profiles) до будь-якого запису (AC-EDITOR-08, AC-DSYS-02). Запис — клієнтом
// користувача: діють RLS (лише admin змінює незбережені зміни) і column grants. Кожна зміна зберігається одразу —
// незбережені зміни шаблону (AC-EDITOR-01); тригери бази ставлять «Unpublished changes».

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Шаблон зі шляху редактора; не admin — на сторінку редактора, де показано «Not enough rights». */
async function editorContext(formData: FormData) {
  const templateId = field(formData, "template_id");
  const editPath = UUID.test(templateId) ? `/templates/${templateId}/edit` : "/templates";
  const { supabase, viewer } = await requireAdmin(editPath);
  if (!UUID.test(templateId)) redirect("/templates");
  const back = (query = "") => {
    revalidatePath(editPath);
    revalidatePath("/templates");
    redirect(`${editPath}${query}`);
  };
  const fail = (error: { message?: string } | null | undefined) => back(`?error=${dbErrorCode(error)}`);
  return { supabase, viewer, templateId, back, fail };
}

/** Секції цього шаблону: id секції з форми не довіряємо — лише секція того самого шаблону. */
async function sectionsOf(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], templateId: string) {
  const { data, error } = await supabase.from("template_sections").select("id, position").eq("template_id", templateId);
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(formData: FormData) {
  const { supabase } = await requireAdmin("/templates/new");
  const name = cleanName(formData.get("name"));
  if (!name) redirect("/templates/new?error=NAME_REQUIRED");
  const { data, error } = await supabase.from("templates").insert({ name }).select("id").single();
  if (error || !data) redirect(`/templates/new?error=${dbErrorCode(error)}`);
  revalidatePath("/templates");
  redirect(`/templates/${data.id}/edit`);
}

export async function renameTemplate(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return back("?error=NAME_REQUIRED");
  const { error } = await supabase.from("templates").update({ name }).eq("id", templateId);
  if (error) return fail(error);
  back();
}

export async function addSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return back("?error=NAME_REQUIRED");
  const sections = await sectionsOf(supabase, templateId);
  const { error } = await supabase.from("template_sections").insert({ template_id: templateId, name, position: nextPosition(sections) });
  if (error) return fail(error);
  back();
}

export async function renameSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return back("?error=NAME_REQUIRED");
  const { error } = await supabase
    .from("template_sections")
    .update({ name })
    .eq("id", field(formData, "section_id"))
    .eq("template_id", templateId);
  if (error) return fail(error);
  back();
}

export async function moveSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const moves = swapWithNeighbour(await sectionsOf(supabase, templateId), field(formData, "section_id"), field(formData, "direction") === "up" ? "up" : "down");
  for (const m of moves) {
    const { error } = await supabase.from("template_sections").update({ position: m.position }).eq("id", m.id).eq("template_id", templateId);
    if (error) return fail(error);
  }
  back();
}

export async function removeSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.from("template_sections").delete().eq("id", field(formData, "section_id")).eq("template_id", templateId);
  if (error) return fail(error);
  back();
}

export async function addTask(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const sectionId = field(formData, "section_id");
  const name = cleanName(formData.get("name"));
  if (!name) return back("?error=NAME_REQUIRED");
  if (!(await sectionsOf(supabase, templateId)).some((s) => s.id === sectionId)) return back("?error=DB_ERROR");
  const { data: tasks, error: tasksError } = await supabase.from("template_tasks").select("position").eq("section_id", sectionId);
  if (tasksError) return fail(tasksError);
  const { error } = await supabase
    .from("template_tasks")
    .insert({ section_id: sectionId, name, required: formData.get("required") === "on", position: nextPosition(tasks ?? []) });
  if (error) return fail(error);
  back();
}

/** Задача цього шаблону: id з форми перевіряємо через секції шаблону. */
async function taskOfTemplate(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], templateId: string, taskId: string) {
  const sectionIds = (await sectionsOf(supabase, templateId)).map((s) => s.id);
  if (!sectionIds.length) return null;
  const { data } = await supabase.from("template_tasks").select("id, section_id, position").eq("id", taskId).in("section_id", sectionIds).maybeSingle();
  return data;
}

export async function updateTask(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const task = await taskOfTemplate(supabase, templateId, field(formData, "task_id"));
  const name = cleanName(formData.get("name"));
  if (!task) return back("?error=DB_ERROR");
  if (!name) return back("?error=NAME_REQUIRED");
  const { error } = await supabase.from("template_tasks").update({ name, required: formData.get("required") === "on" }).eq("id", task.id);
  if (error) return fail(error);
  back();
}

export async function moveTask(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const task = await taskOfTemplate(supabase, templateId, field(formData, "task_id"));
  if (!task) return back("?error=DB_ERROR");
  const { data: siblings, error: siblingsError } = await supabase.from("template_tasks").select("id, position").eq("section_id", task.section_id);
  if (siblingsError) return fail(siblingsError);
  for (const m of swapWithNeighbour(siblings ?? [], task.id, field(formData, "direction") === "up" ? "up" : "down")) {
    const { error } = await supabase.from("template_tasks").update({ position: m.position }).eq("id", m.id);
    if (error) return fail(error);
  }
  back();
}

/** Перенесення задачі в іншу секцію того самого шаблону — у кінець (робоче припущення QB). */
export async function moveTaskToSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const task = await taskOfTemplate(supabase, templateId, field(formData, "task_id"));
  const targetId = field(formData, "target_section_id");
  if (!task || !(await sectionsOf(supabase, templateId)).some((s) => s.id === targetId)) return back("?error=DB_ERROR");
  if (targetId === task.section_id) return back();
  const { data: targetTasks, error: targetError } = await supabase.from("template_tasks").select("position").eq("section_id", targetId);
  if (targetError) return fail(targetError);
  const { error } = await supabase.from("template_tasks").update({ section_id: targetId, position: nextPosition(targetTasks ?? []) }).eq("id", task.id);
  if (error) return fail(error);
  back();
}

export async function removeTask(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const task = await taskOfTemplate(supabase, templateId, field(formData, "task_id"));
  if (!task) return back("?error=DB_ERROR");
  const { error } = await supabase.from("template_tasks").delete().eq("id", task.id);
  if (error) return fail(error);
  back();
}

/** AC-EDITOR-03, AC-EDITOR-04: збереження версії — функцією бази (роль перевіряє й вона, AC-EDITOR-08). */
export async function saveVersion(formData: FormData) {
  const { supabase, templateId, back } = await editorContext(formData);
  const { data: number, error } = await supabase.rpc("save_template_version", { p_template_id: templateId });
  if (error || !number) {
    const code = dbErrorCode(error);
    return back(`?error=${code === "NOT_ALLOWED" ? "NOT_ALLOWED_TEMPLATES" : code}`);
  }
  back(`?saved=${number}`);
}

// Навмисне порушення для доказу архітектурного правила (revert одразу після червоного прогону).
export async function resetDraft(formData: FormData) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("template_sections").delete().eq("template_id", String(formData.get("template_id")));
}
