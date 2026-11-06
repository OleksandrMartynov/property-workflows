import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PageSkeleton } from "../../../_components/skeletons";

// Завантаження версій шаблону: «← Editor», назва й стрічка версій (крапка на осі, назва версії, дата й автор).
export default function VersionsLoading() {
  return (
    <PageSkeleton label="Loading versions…">
      <HeaderSkeleton back title="w-72" />
      <div className="flex max-w-3xl flex-col rounded-md border border-border bg-card shadow-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5">
            <Skeleton className="mt-1 size-3 rounded-full" />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
