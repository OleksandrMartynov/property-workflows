import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Status = "todo" | "progress" | "done" | "overdue" | "due-soon";

const tones: Record<Status, string> = {
  todo: "bg-status-todo text-status-todo-foreground",
  progress: "bg-status-progress text-status-progress-foreground",
  done: "bg-status-done text-status-done-foreground",
  overdue: "bg-status-overdue text-status-overdue-foreground",
  "due-soon": "bg-status-due-soon text-status-due-soon-foreground",
};

const marks: Record<Status, string> = {
  todo: "text-status-todo-mark",
  progress: "text-status-progress-mark",
  done: "text-status-done-mark",
  overdue: "text-status-overdue-mark",
  "due-soon": "text-status-due-soon-mark",
};

/** Статус ніколи не лише кольором: форма іконки (кільце, півкільце, галочка, знак оклику, годинник) і слово поруч. */
export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const shared = { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, className: cn("size-3.5 shrink-0", marks[status], className) } as const;
  switch (status) {
    case "done":
      return (
        <svg {...shared}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.8 8.2l2.2 2.2 4.2-4.6" stroke="var(--background)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "progress":
      return (
        <svg {...shared}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 4.2a3.8 3.8 0 0 1 0 7.6z" fill="currentColor" />
        </svg>
      );
    case "overdue":
      return (
        <svg {...shared}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 4.8v3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="11" r="1" fill="currentColor" />
        </svg>
      );
    case "due-soon":
      return (
        <svg {...shared}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 5v3.2l2 1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...shared}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.4 2.2" />
        </svg>
      );
  }
}

export function StatusBadge({
  status,
  className,
  children,
  ...props
}: Omit<ComponentProps<"span">, "children"> & { status: Status; children: ReactNode }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1.5 rounded-full pl-1.5 pr-2 text-meta font-medium whitespace-nowrap", tones[status], className)}
      {...props}
    >
      <StatusIcon status={status} />
      {children}
    </span>
  );
}
