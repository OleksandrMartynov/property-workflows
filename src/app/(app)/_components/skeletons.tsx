// Спільні блоки скелетів сторінок застосунку: та сама форма, що й зміст (без стрибка макета), і швидкий вихід униз,
// коли приходить зміст (SkeletonExit, motion.tsx). role="status" і прихований підпис — для скрінрідера.
import type { ReactNode } from "react";
import { SkeletonExit } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

/** Оболонка скелета сторінки: статус для скрінрідера й анімація виходу. */
export function PageSkeleton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <SkeletonExit>
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">{label}</span>
        {children}
      </div>
    </SkeletonExit>
  );
}

/** Шапка сторінки: «← назад» (за потреби), заголовок і дія праворуч. */
export function HeaderSkeleton({ back = false, title = "w-48", action = false }: { back?: boolean; title?: string; action?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        {back ? <Skeleton className="h-3.5 w-16" /> : null}
        <Skeleton className={`h-7 ${title}`} />
      </div>
      {action ? <Skeleton className="h-8 w-36" /> : null}
    </div>
  );
}

/** Рядок фільтрів над списком: вигляди (Segmented) і пошук — як FilterBar. */
export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-8 w-full max-w-72" />
      <Skeleton className="h-8 w-full sm:ml-auto sm:w-72" />
    </div>
  );
}

/** Таблиця запусків: двохрядкова перша комірка (назва + шаблон), решта колонок ховаються на вузьких екранах. */
export function RunsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="h-8 border-b border-border bg-muted/50" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-11 items-center gap-6 border-b border-border px-4 last:border-b-0">
          <div className="flex w-48 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-3.5 w-16 sm:block" />
          <Skeleton className="hidden h-3.5 w-24 sm:block" />
          <Skeleton className="hidden h-3.5 w-32 md:block" />
          <Skeleton className="hidden size-5 rounded-full md:block" />
          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
