import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Порожній список: що тут буде й що зробити далі. Текст — дослівно з AC, якщо він там є. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong/50 px-6 py-12 text-center", className)}>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="size-10 text-muted-foreground/60">
        <path d="M6 40V22L24 6l18 16v18" stroke="currentColor" strokeWidth="2" />
        <path d="M14 40V25.3l10-9.8 10 9.8V40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
      <div className="flex flex-col gap-1">
        <p className="text-heading">{title}</p>
        {description ? <p className="max-w-sm text-body text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
