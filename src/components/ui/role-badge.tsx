import type { ComponentProps } from "react";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { ShieldIcon, UserIcon } from "./icons";

/**
 * Роль завжди іконкою, кольором і словом: адміністратор — щит і акцентний відтінок, менеджер — людина й нейтральний.
 * Колір не несе змісту сам: слово поруч.
 */
export function RoleBadge({ role, className, ...props }: Omit<ComponentProps<"span">, "children"> & { role: string }) {
  const admin = role === "admin";
  const Icon = admin ? ShieldIcon : UserIcon;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full pl-1.5 pr-2 text-meta font-medium whitespace-nowrap",
        admin ? "bg-status-progress text-status-progress-foreground" : "bg-secondary text-secondary-foreground",
        className,
      )}
      {...props}
    >
      <Icon className="size-3" />
      {roleLabel(role)}
    </span>
  );
}
