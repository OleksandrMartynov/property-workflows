import { Skeleton } from "@/components/ui/skeleton";

// Завантаження редактора: заголовок з діями, дві секції з рядками задач і панель Details.
export default function EditorLoading() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading template…</span>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-6 w-56" />
          </div>
          <Skeleton className="h-5 w-48 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-6">
          {[3, 2].map((rows, s) => (
            <div key={s} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                {Array.from({ length: rows + 1 }, (_, i) => (
                  <div key={i} className="flex h-11 items-center gap-3 border-b border-border px-4 last:border-b-0">
                    <Skeleton className="h-3 w-4" />
                    <Skeleton className="h-3.5 w-56" />
                    <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
          <Skeleton className="h-4 w-16" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
    </div>
  );
}
