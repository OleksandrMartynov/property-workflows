import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./status-badge";

const tones = {
  error: "border-status-overdue-mark/30 bg-status-overdue text-status-overdue-foreground",
  success: "border-status-done-mark/30 bg-status-done text-status-done-foreground",
  info: "border-status-progress-mark/30 bg-status-progress text-status-progress-foreground",
} as const;

const icons = { error: "overdue", success: "done", info: "progress" } as const;

/** Повідомлення про результат дії. Помилка — `role="alert"`, текст дослівно з AC; успіх — `role="status"`. */
export function Alert({ variant = "info", className, children }: { variant?: keyof typeof tones; className?: string; children: ReactNode }) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-body", tones[variant], className)}
    >
      <StatusIcon status={icons[variant]} className="mt-0.5 size-4" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
