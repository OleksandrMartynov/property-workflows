import { Skeleton } from "@/components/ui/skeleton";

// Завантаження галереї шаблонів: заголовок, пошук і картки тієї ж форми, що й зміст.
export default function TemplatesLoading() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading templates…</span>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-8 w-full sm:w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <Skeleton className="size-9 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-48" />
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
