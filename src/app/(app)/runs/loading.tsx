import { Skeleton } from "@/components/ui/skeleton";

// Завантаження списку запусків: скелет таблиці тієї ж форми, що й сама таблиця, — без стрибка макета.
export default function RunsLoading() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading runs…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <div className="h-8 border-b border-border bg-muted/50" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-6 border-b border-border px-4 last:border-b-0">
            <div className="flex w-48 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="hidden h-3.5 w-32 md:block" />
            <Skeleton className="hidden size-5 rounded-full md:block" />
            <Skeleton className="ml-auto h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
