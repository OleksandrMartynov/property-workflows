// Поточна версія шаблону (глосарій PM, «Current version») — те, що менеджер бачить і запускає (AC-EDITOR-02,
// AC-EDITOR-06). Робочі таблиці template_sections / template_tasks — незбережені зміни, їх читає лише адміністратор
// (ADR 0006); назву шаблону для запуску теж беремо з версії, бо templates.name — незбережена назва.
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface CurrentVersion {
  templateId: string;
  versionId: string;
  number: number;
  name: string;
}

export interface VersionTask {
  version_id: string;
  template_task_id: string;
  section_name: string;
  section_position: number;
  position: number;
  name: string;
  required: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Адреса сторінки з не-uuid замість id — «Template not found», а не помилка Postgres (AC-EDITOR-16). */
export const isUuid = (value: string) => UUID.test(value);

/** Для кожного шаблону — лише його поточна версія; шаблони без збереженої версії відкинуто. */
export function pickCurrent(
  templates: readonly { id: string; current_version: number | null }[],
  versions: readonly { id: string; template_id: string; number: number; name: string }[],
): CurrentVersion[] {
  const current = new Map(templates.filter((t) => t.current_version !== null).map((t) => [t.id, t.current_version]));
  return versions
    .filter((v) => current.get(v.template_id) === v.number)
    .map((v) => ({ templateId: v.template_id, versionId: v.id, number: v.number, name: v.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Секції й задачі версії для форми запуску в порядку шаблону. Ключ задачі — template_task_id: саме його launch_run
 * приймає в призначеннях виконавців (AC-RUN-04).
 */
export function toLaunchSections(tasks: readonly VersionTask[]) {
  const ordered = [...tasks].sort((a, b) => a.section_position - b.section_position || a.position - b.position);
  const sections: { id: string; name: string }[] = [];
  for (const t of ordered) {
    const id = `section-${t.section_position}`;
    if (!sections.some((s) => s.id === id)) sections.push({ id, name: t.section_name });
  }
  return {
    sections,
    tasks: ordered.map((t) => ({ id: t.template_task_id, section_id: `section-${t.section_position}`, name: t.name, required: t.required })),
  };
}

/** Склад версії для списку шаблонів: «N sections · M tasks, K required». */
export function countVersion(tasks: readonly Pick<VersionTask, "section_position" | "required">[]) {
  return {
    sections: new Set(tasks.map((t) => t.section_position)).size,
    total: tasks.length,
    required: tasks.filter((t) => t.required).length,
  };
}

/** Поточні версії шаблонів, видимих користувачу (RLS: менеджер бачить лише поточну версію). */
export async function loadCurrentVersions(supabase: Supabase, templateIds?: string[]): Promise<CurrentVersion[]> {
  let query = supabase.from("templates").select("id, current_version").not("current_version", "is", null);
  if (templateIds) query = query.in("id", templateIds);
  const { data: templates, error } = await query;
  if (error) throw error;
  if (!templates?.length) return [];
  const { data: versions, error: versionsError } = await supabase
    .from("template_versions")
    .select("id, template_id, number, name")
    .in(
      "template_id",
      templates.map((t) => t.id),
    );
  if (versionsError) throw versionsError;
  return pickCurrent(templates, versions ?? []);
}

/** Секції й задачі версій (знімок, ADR 0006). */
export async function loadVersionTasks(supabase: Supabase, versionIds: string[]): Promise<VersionTask[]> {
  if (!versionIds.length) return [];
  const { data, error } = await supabase
    .from("template_version_tasks")
    .select("version_id, template_task_id, section_name, section_position, position, name, required")
    .in("version_id", versionIds);
  if (error) throw error;
  return data ?? [];
}
