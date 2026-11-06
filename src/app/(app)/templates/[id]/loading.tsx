import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, PageSkeleton } from "../../_components/skeletons";

// Завантаження сторінки шаблону: «← Templates», назва з версією й «Launch», секції з задачами поточної версії.
export default function TemplateLoading() {
  return (
    <PageSkeleton label="Loading template…">
      <HeaderSkeleton back title="w-56" action />
      <div className="flex flex-col gap-6">
        {[3, 2].map((tasks, s) => (
          <div key={s} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-card shadow-sm">
              {Array.from({ length: tasks }, (_, i) => (
                <div key={i} className="flex h-11 items-center gap-3 px-4">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="ml-auto h-5 w-16 rounded-xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
