import { AppShell } from "@/components/ui/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "../../login/actions";

// Завантаження сторінки запуску: заголовок, дві секції чекліста й панель Details.
export default function RunLoading() {
  return (
    <AppShell signOutAction={signOut}>
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Loading run…</span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex flex-col gap-6">
            {[3, 2].map((rows, s) => (
              <div key={s} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                  {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="flex h-11 items-center gap-3 border-b border-border px-4 last:border-b-0">
                      <Skeleton className="size-4 rounded-full" />
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="ml-auto h-3.5 w-32" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-1 w-full rounded-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
