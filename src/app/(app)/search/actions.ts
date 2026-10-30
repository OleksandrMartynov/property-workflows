"use server";

import { ilikePattern, parseRunQuery } from "@/lib/runs/views";
import { runStatusLabel } from "@/lib/runs/labels";
import { canManageTemplates, isVendor, requireViewer } from "@/lib/supabase/viewer";
import { loadCurrentVersions } from "@/lib/templates/current";

export type WorkspaceHit = { id: string; label: string; detail: string; href: string; group: "Run" | "Template" };

const LIMIT = 6;
const matches = (text: string, query: string) => text.toLowerCase().includes(query.toLowerCase());

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
    const { data, error } = await supabase.rpc("vendor_runs");
    if (error) throw error;
    return (data ?? [])
      .filter((run) => matches(run.case_name, query))
      .slice(0, LIMIT)
      .map((run) => ({ id: run.id, label: run.case_name, detail: runStatusLabel(run.status), href: `/runs/${run.id}`, group: "Run" }));
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

async function searchTemplates(supabase: Awaited<ReturnType<typeof requireViewer>>["supabase"], role: Parameters<typeof canManageTemplates>[0], query: string): Promise<WorkspaceHit[]> {
  if (canManageTemplates(role)) {
    const { data, error } = await supabase.rpc("list_template_drafts");
    if (error) throw error;
    return (data ?? [])
      .filter((t) => matches(t.name, query))
      .slice(0, LIMIT)
      .map((t) => ({ id: t.id, label: t.name, detail: t.current_version ? `Version ${t.current_version}` : "Unpublished changes", href: `/templates/${t.id}/edit`, group: "Template" }));
  }
  return (await loadCurrentVersions(supabase))
    .filter((t) => matches(t.name, query))
    .slice(0, LIMIT)
    .map((t) => ({ id: t.templateId, label: t.name, detail: `Version ${t.number}`, href: `/templates/${t.templateId}`, group: "Template" }));
}
