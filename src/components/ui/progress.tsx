import { cn } from "@/lib/utils";

/** Тонка смужка прогресу. Число завжди пишемо поруч словами («2 of 5 done»), смужка — лише підсилення. */
export function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const complete = total > 0 && done >= total;
  return (
    <div aria-hidden="true" className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("animate-ui-grow h-full rounded-full transition-[width] duration-(--duration-slow) ease-in-out-soft", complete ? "bg-status-done-mark" : "bg-primary")}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
