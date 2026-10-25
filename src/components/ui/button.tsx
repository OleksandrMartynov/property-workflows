import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-label press disabled:opacity-50 aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-secondary text-secondary-foreground hover:bg-accent active:bg-state-pressed",
  outline: "border border-border bg-card text-foreground hover:bg-state-hover active:bg-state-pressed",
  ghost: "text-foreground hover:bg-state-hover active:bg-state-pressed",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover",
  link: "h-auto rounded-xs px-0 text-primary underline decoration-primary/35 underline-offset-4 hover:decoration-primary",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5",
  md: "h-8 px-3",
  lg: "h-9 px-4 text-body",
  xl: "h-11 px-5 text-body",
  icon: "size-8",
};

/** Класи кнопки для посилань: `<Link className={buttonVariants({ variant: "outline" })}>`. */
export function buttonVariants({
  variant = "default",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], variant === "link" ? undefined : sizes[size], className);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-3.5 animate-ui-spin", className)}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Одна основна дія на екран — `default`; `destructive` лише з підтвердженням. */
export function Button({
  variant,
  size,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
