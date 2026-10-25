"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorCode } from "@/lib/runs/messages";
import { requireAdmin } from "@/lib/supabase/viewer";
import { cleanName } from "@/lib/templates/editor";

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
  // NOT_ALLOWED функції бази — та сама відмова, що й на сторінці: «Not enough rights».
  const fail = (error: { message?: string } | null | undefined) => {
    const code = dbErrorCode(error);
    return back(`?error=${code === "NOT_ALLOWED" ? "NOT_ALLOWED_TEMPLATES" : code}`);
  };
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
  // Позицію в кінці рахує функція бази під блокуванням шаблону: паралельні додавання не дадуть однакову позицію.
  const { error } = await supabase.rpc("add_template_section", { p_template_id: templateId, p_name: name });
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

/** Вгору чи вниз: обмін позицій із сусідом — функцією бази, в одній транзакції (роль admin перевіряє й вона). */
async function move(formData: FormData, kind: "section" | "task", idField: string) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.rpc("move_template_item", {
    p_template_id: templateId,
    p_kind: kind,
    p_id: field(formData, idField),
    p_direction: field(formData, "direction") === "up" ? "up" : "down",
  });
  if (error) return fail(error);
  back();
}

export async function moveSection(formData: FormData) {
  return move(formData, "section", "section_id");
}

export async function removeSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.from("template_sections").delete().eq("id", field(formData, "section_id")).eq("template_id", templateId);
  if (error) return fail(error);
  back();
}

export async function addTask(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return back("?error=NAME_REQUIRED");
  const { error } = await supabase.rpc("add_template_task", {
    p_template_id: templateId,
    p_section_id: field(formData, "section_id"),
    p_name: name,
    p_required: formData.get("required") === "on",
  });
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
  return move(formData, "task", "task_id");
}

export async function moveTaskToSection(formData: FormData) {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.rpc("move_template_task_to_section", {
    p_template_id: templateId,
    p_task_id: field(formData, "task_id"),
    p_section_id: field(formData, "target_section_id"),
  });
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
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { data: number, error } = await supabase.rpc("save_template_version", { p_template_id: templateId });
  if (error || !number) return fail(error);
  back(`?saved=${number}`);
}
