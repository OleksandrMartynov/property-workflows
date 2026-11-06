import { FilterBarSkeleton, HeaderSkeleton, PageSkeleton, RunsTableSkeleton } from "../_components/skeletons";

// Завантаження списку запусків: заголовок, рядок фільтрів (вигляди й пошук) і таблиця тієї ж форми, що й зміст, —
// таблиця не «стрибає» вниз, коли з'являється FilterBar.
export default function RunsLoading() {
  return (
    <PageSkeleton label="Loading runs…">
      <HeaderSkeleton title="w-20" />
      <FilterBarSkeleton />
      <RunsTableSkeleton />
    </PageSkeleton>
  );
}
