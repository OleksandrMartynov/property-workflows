import type { requireViewer } from "@/lib/supabase/viewer";
import { PageShell } from "@/app/_components/ui";
import { VendorRunsList } from "./vendor-runs-list";

/**
 * Список запусків для підрядника (AC-VENDOR-03, AC-VENDOR-10): лише запуски з його задачами й «Your tasks: N of K
 * done» — із vendor_runs (рядки runs із шаблоном і версією база йому не віддає).
 */
export async function VendorRunsPage({ supabase }: Pick<Awaited<ReturnType<typeof requireViewer>>, "supabase">) {
  const { data, error } = await supabase.rpc("vendor_runs");
  if (error) throw error;
  return (
    <PageShell title="Runs">
      <VendorRunsList runs={(data ?? []).map((r) => ({ ...r, done: Number(r.done), total: Number(r.total) }))} />
    </PageShell>
  );
}
