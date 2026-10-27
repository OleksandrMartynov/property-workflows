"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorCode } from "@/lib/runs/messages";
import { requireAdmin } from "@/lib/supabase/viewer";
import { cleanName } from "@/lib/templates/editor";
import type { ActionOutcome } from "@/lib/templates/save-state";

// Дії редактора шаблону (зріз 2, задача 2): кожна — публічний POST-ендпойнт, тож першим кроком requireAdmin()
// (getClaims() + роль admin із profiles) до будь-якого запису (AC-EDITOR-08, AC-DSYS-02). Запис — клієнтом
// користувача: діють RLS (лише admin змінює незбережені зміни) і column grants. Зміни секцій і задач — лише функціями
// бази, які першим кроком блокують рядок шаблону: однаковий порядок блокувань (шаблон → секція / задача), без deadlock.
// З клієнта (поле client=1, AC-EDITOR-25) дії повертають результат замість redirect: збій не веде на error.tsx, а
// редактор показує «Your last change was not kept. Try again.» і лишає зміну на екрані. Без client=1 — redirect, як раніше.
// Кожна зміна зберігається одразу — незбережені зміни шаблону (AC-EDITOR-01); тригери бази ставлять «Unpublished changes».

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Шаблон зі шляху редактора; не admin — на сторінку редактора, де показано «Not enough rights». */
async function editorContext(formData: FormData) {
  const templateId = field(formData, "template_id");
  const editPath = UUID.test(templateId) ? `/templates/${templateId}/edit` : "/templates";
  const { supabase, viewer } = await requireAdmin(editPath);
  if (!UUID.test(templateId)) redirect("/templates");
  const client = field(formData, "client") === "1";
  const refresh = () => {
    revalidatePath(editPath);
    revalidatePath("/templates");
  };
  const back = (query = ""): ActionOutcome => {
    refresh();
    if (client) return { ok: true };
    redirect(`${editPath}${query}`);
  };
  /** Відмова з кодом повідомлення: redirect на ?error=… або, з клієнта, результат із кодом. */
  const reject = (code: string): ActionOutcome => {
    if (client) return { ok: false, code };
    return back(`?error=${code}`);
  };
  // NOT_ALLOWED функції бази — та сама відмова, що й на сторінці: «Not enough rights».
  const fail = (error: { message?: string } | null | undefined) => {
    const code = dbErrorCode(error);
    return reject(code === "NOT_ALLOWED" ? "NOT_ALLOWED_TEMPLATES" : code);
  };
  return { supabase, viewer, templateId, back, reject, fail };
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

export async function renameTemplate(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, reject, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return reject("NAME_REQUIRED");
  const { error } = await supabase.from("templates").update({ name }).eq("id", templateId);
  if (error) return fail(error);
  return back();
}

export async function addSection(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, reject, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return reject("NAME_REQUIRED");
  // Позицію в кінці рахує функція бази під блокуванням шаблону: паралельні додавання не дадуть однакову позицію.
  const { error } = await supabase.rpc("add_template_section", { p_template_id: templateId, p_name: name });
  if (error) return fail(error);
  return back();
}

export async function renameSection(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, reject, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return reject("NAME_REQUIRED");
  const { error } = await supabase.rpc("rename_template_section", {
    p_template_id: templateId,
    p_section_id: field(formData, "section_id"),
    p_name: name,
  });
  if (error) return fail(error);
  return back();
}

/** Вгору чи вниз: обмін позицій із сусідом — функцією бази, в одній транзакції (роль admin перевіряє й вона). */
async function move(formData: FormData, kind: "section" | "task", idField: string): Promise<ActionOutcome> {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.rpc("move_template_item", {
    p_template_id: templateId,
    p_kind: kind,
    p_id: field(formData, idField),
    p_direction: field(formData, "direction") === "up" ? "up" : "down",
  });
  if (error) return fail(error);
  return back();
}

export async function moveSection(formData: FormData): Promise<ActionOutcome> {
  return move(formData, "section", "section_id");
}

export async function removeSection(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.rpc("remove_template_section", { p_template_id: templateId, p_section_id: field(formData, "section_id") });
  if (error) return fail(error);
  return back();
}

export async function addTask(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, reject, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return reject("NAME_REQUIRED");
  const { error } = await supabase.rpc("add_template_task", {
    p_template_id: templateId,
    p_section_id: field(formData, "section_id"),
    p_name: name,
    p_required: formData.get("required") === "on",
  });
  if (error) return fail(error);
  return back();
}

/** Задача цього шаблону: id з форми перевіряє функція бази (через секції шаблону). */
export async function updateTask(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, reject, fail } = await editorContext(formData);
  const name = cleanName(formData.get("name"));
  if (!name) return reject("NAME_REQUIRED");
  const { error } = await supabase.rpc("update_template_task", {
    p_template_id: templateId,
    p_task_id: field(formData, "task_id"),
    p_name: name,
    p_required: formData.get("required") === "on",
  });
  if (error) return fail(error);
  return back();
}

export async function moveTask(formData: FormData): Promise<ActionOutcome> {
  return move(formData, "task", "task_id");
}

export async function moveTaskToSection(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.rpc("move_template_task_to_section", {
    p_template_id: templateId,
    p_task_id: field(formData, "task_id"),
    p_section_id: field(formData, "target_section_id"),
  });
  if (error) return fail(error);
  return back();
}

export async function removeTask(formData: FormData): Promise<ActionOutcome> {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { error } = await supabase.rpc("remove_template_task", { p_template_id: templateId, p_task_id: field(formData, "task_id") });
  if (error) return fail(error);
  return back();
}

/** AC-EDITOR-03, AC-EDITOR-04: збереження версії — функцією бази (роль перевіряє й вона, AC-EDITOR-08). */
export async function saveVersion(formData: FormData): Promise<void> {
  const { supabase, templateId, back, fail } = await editorContext(formData);
  const { data: number, error } = await supabase.rpc("save_template_version", { p_template_id: templateId });
  if (error || !number) {
    fail(error);
    return;
  }
  back(`?saved=${number}`);
}
