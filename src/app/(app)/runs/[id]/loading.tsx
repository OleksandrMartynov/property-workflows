import { SkeletonExit } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

// Завантаження сторінки запуску: заголовок, панель Details (на телефоні — над задачами, як і сторінка) і дві секції
// чекліста з дворядковими рядками задач (назва, під нею виконавець; праворуч статус).
export default function RunLoading() {
  return (
    <SkeletonExit>
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Loading run…</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm lg:col-start-2 lg:row-start-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-1 w-full rounded-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
            {[3, 2].map((rows, s) => (
              <div key={s} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                  {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                      <Skeleton className="size-4 rounded-full" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-48 max-w-full" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="hidden h-3.5 w-12 sm:block" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonExit>
  );
}
