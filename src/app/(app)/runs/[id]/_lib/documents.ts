import type { requireViewer } from "@/lib/supabase/viewer";

type Supabase = Awaited<ReturnType<typeof requireViewer>>["supabase"];

/** Збережені записи документів запуску, новіший — першим (AC-DOCAI-04); помилка бази — сторінка помилки. */
export async function loadRunDocuments(supabase: Supabase, runId: string) {
  const { data, error } = await supabase
    .from("run_documents")
    .select("id, kind, phone, description, category, urgency, items, total, saved_by, saved_at")
    .eq("run_id", runId)
    .order("saved_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
