import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PageSkeleton } from "../../../_components/skeletons";

// Завантаження форми запуску: поле назви випадку, виконавці за секціями й бокова картка з «Launch» — та сама сітка, що
// й форма (lg: зміст і колонка 20rem).
export default function LaunchLoading() {
  return (
    <PageSkeleton label="Loading launch form…">
      <HeaderSkeleton back title="w-64" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="flex items-center justify-between gap-3 px-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-full sm:w-56" />
          </div>
          {[3, 2].map((tasks, s) => (
            <div key={s} className="flex flex-col divide-y divide-border rounded-md border border-border bg-card shadow-sm">
              <div className="px-4 py-3">
                <Skeleton className="h-4 w-32" />
              </div>
              {Array.from({ length: tasks }, (_, i) => (
                <div key={i} className="flex h-12 items-center gap-3 px-4">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="ml-auto h-8 w-56" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </PageSkeleton>
  );
}
