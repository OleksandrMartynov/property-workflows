import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "outline" | "primary" | "changed" | "ai" | "variable";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-muted-foreground",
  primary: "bg-status-progress text-status-progress-foreground",
  // Незбережена зміна в редакторі («New», «Edited») — теплий жовтий, як «Unpublished changes» («Вигляд і тон»).
  changed: "bg-status-due-soon text-status-due-soon-foreground",
  ai: "bg-ai text-ai-foreground",
  variable: "bg-variable text-variable-foreground",
};

/** Нейтральна мітка (роль, «required»). Статус домену — `StatusBadge`: він завжди з іконкою й текстом. */
export function Badge({ variant = "neutral", className, ...props }: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1 rounded-xs px-1.5 text-meta font-medium whitespace-nowrap", variants[variant], className)}
      {...props}
    />
  );
}
