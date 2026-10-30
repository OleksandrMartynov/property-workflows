import { Skeleton } from "@/components/ui/skeleton";

// Завантаження сторінки застосунку (головна, шаблони, форма запуску, версії): заголовок і картка тієї ж форми, що й
// зміст, — без стрибка макета. Списки запусків мають власний скелет таблиці (runs/loading.tsx).
export default function AppLoading() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-7 w-48" />
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <Skeleton className="h-4 w-56" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-3.5 w-full max-w-md" />
        ))}
      </div>
    </div>
  );
}
