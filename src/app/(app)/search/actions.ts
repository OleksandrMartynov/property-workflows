"use server";

import { ilikePattern, parseRunQuery } from "@/lib/runs/views";
import { runStatusLabel } from "@/lib/runs/labels";
import { canManageTemplates, isVendor, requireViewer } from "@/lib/supabase/viewer";

export type WorkspaceHit = { id: string; label: string; detail: string; href: string; group: "Run" | "Template" };

const LIMIT = 6;

/**
 * Пошук у ⌘K (docs/ux/ux-plan.md, партія 5): запуски за назвою випадку й шаблони за назвою. Лише читання й лише через
 * RLS-клієнт того, хто шукає: підрядник — лише свої запуски (vendor_runs), без шаблонів (AC-VENDOR-08); менеджер —
 * видимі йому запуски (AC-TASK-06) і поточні версії шаблонів; адміністратор — ще й шаблони без збереженої версії.
 */
export async function searchWorkspace(raw: string): Promise<WorkspaceHit[]> {
  const { supabase, viewer } = await requireViewer();
  const query = parseRunQuery(raw);
  if (query.length < 2) return [];

  if (isVendor(viewer.role)) {
    const { data, error } = await supabase.rpc("vendor_runs").ilike("case_name", ilikePattern(query)).limit(LIMIT);
    if (error) throw error;
    return (data ?? []).map((run) => ({ id: run.id, label: run.case_name, detail: runStatusLabel(run.status), href: `/runs/${run.id}`, group: "Run" }));
  }

  const [runs, templates] = await Promise.all([
    supabase.from("runs").select("id, case_name, template_name, status").ilike("case_name", ilikePattern(query)).order("created_at", { ascending: false }).limit(LIMIT),
    searchTemplates(supabase, viewer.role, query),
  ]);
  if (runs.error) throw runs.error;
  return [
    ...(runs.data ?? []).map((run): WorkspaceHit => ({ id: run.id, label: run.case_name, detail: `${run.template_name} · ${runStatusLabel(run.status)}`, href: `/runs/${run.id}`, group: "Run" })),
    ...templates,
  ];
}

// Фільтр і ліміт — у самому запиті (ilike + limit), а не після відповіді: відповідь PostgREST обмежена (1000 рядків).
async function searchTemplates(supabase: Awaited<ReturnType<typeof requireViewer>>["supabase"], role: Parameters<typeof canManageTemplates>[0], query: string): Promise<WorkspaceHit[]> {
  if (canManageTemplates(role)) {
    const { data, error } = await supabase.rpc("list_template_drafts").ilike("name", ilikePattern(query)).limit(LIMIT);
    if (error) throw error;
    return (data ?? []).map((t) => ({ id: t.id, label: t.name, detail: t.current_version ? `Version ${t.current_version}` : "Unpublished changes", href: `/templates/${t.id}/edit`, group: "Template" }));
  }
  // Менеджер: RLS template_versions_select віддає лише поточні версії (AC-EDITOR-29) — збіг за назвою поточної версії.
  const { data, error } = await supabase.from("template_versions").select("template_id, number, name").ilike("name", ilikePattern(query)).limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((v) => ({ id: v.template_id, label: v.name, detail: `Version ${v.number}`, href: `/templates/${v.template_id}`, group: "Template" }));
}
