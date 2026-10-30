import { FilterBar } from "@/components/ui/filter-bar";
import { isFiltered, parseRunQuery, parseRunView, RUN_VIEWS } from "@/lib/runs/views";
import { isVendor, requireViewer } from "@/lib/supabase/viewer";
import { PageShell } from "@/app/_components/ui";
import { RunsList } from "./_components/runs-list";
import { RunsPager } from "./_components/runs-pager";
import { VendorRunsPage } from "./_components/vendor-runs-page";
import { loadRunsPage, PAGE_SIZE } from "./_lib/runs-query";
import { loadRunSummaries } from "./_lib/summaries";

export const metadata = { title: "Runs" };

// Список запусків: AC-TASK-06 — менеджер бачить лише запуски, де він менеджер запуску або виконавець хоча б однієї
// задачі (RLS, private.can_see_run), адміністратор — усі; AC-TASK-09 — прогрес «N of M done» кожного запуску
// (рахує база: view run_progress). Сторінками по PAGE_SIZE, від новіших до старіших. Вигляди All · Mine · In progress ·
// Completed і пошук за назвою випадку — ?view=, ?q= (docs/ux/ux-plan.md, партія 3).
export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  const { page: rawPage, view: rawView, q } = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof rawPage === "string" ? rawPage : "1", 10) || 1);
  const session = await requireViewer();

  // AC-VENDOR-03, AC-VENDOR-10: підрядник — окремий список (vendor_runs).
  if (isVendor(session.viewer.role)) return await VendorRunsPage({ supabase: session.supabase });

  const view = parseRunView(rawView);
  const query = parseRunQuery(q);
  const filtered = isFiltered(view, query);
  const { runs, total } = await loadRunsPage(session, { view, query, page });
  const { summary, emailOf } = await loadRunSummaries(
    session.supabase,
    runs.map((r) => r.id),
  );
  const managerOf = (run: { run_manager_id: string }) => (run.run_manager_id === session.viewer.id ? "me" : (emailOf.get(run.run_manager_id) ?? "—"));
  const params = { ...(view === "all" ? {} : { view }), ...(query ? { q: query } : {}) };

  return (
    <PageShell title="Runs">
      {/* Без жодного запуску й без фільтрів — лише порожній стан AC-DSYS-04, без зайвих елементів. */}
      {total > 0 || filtered ? <FilterBar views={[...RUN_VIEWS]} view={view} query={query} searchLabel="Search runs" /> : null}
      <RunsList runs={runs} summary={summary} managerOf={managerOf} filtered={filtered} />
      <RunsPager page={page} total={total} pageSize={PAGE_SIZE} params={params} />
    </PageShell>
  );
}
