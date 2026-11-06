import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PageSkeleton, RunsTableSkeleton } from "./_components/skeletons";

// Завантаження головної (і сторінок без власного скелета): шапка з дією, три лічильники й останні запуски — тієї ж
// форми, що й зміст, без стрибка макета.
export default function AppLoading() {
  return (
    <PageSkeleton label="Loading…">
      <HeaderSkeleton title="w-24" action />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-[76px] flex-col justify-between rounded-md border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <RunsTableSkeleton rows={5} />
    </PageSkeleton>
  );
}
