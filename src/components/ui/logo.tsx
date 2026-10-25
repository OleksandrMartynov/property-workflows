import { cn, hasSizeClass } from "@/lib/utils";

/** Знак Echo Roof: дах, що луною повторює себе всередині, — «один процес, який щоразу запускається знову». Колір — currentColor. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", !hasSizeClass(className) && "size-5", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M3 22V12L12 3L21 12V22" stroke="currentColor" strokeWidth="2" />
      <path d="M7 22V13.66L12 8.66L17 13.66V22" stroke="currentColor" strokeWidth="2" />
      <path d="M10 22V14.9L12 12.9L14 14.9V22Z" fill="currentColor" />
    </svg>
  );
}

/** Знак у кольорі primary + назва продукту. */
export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark className="text-primary" />
      {showName ? <span className="text-heading tracking-tight">Property Workflows</span> : null}
    </span>
  );
}
