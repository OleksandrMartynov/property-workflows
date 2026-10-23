import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Щільна таблиця (рядок 36 px). Контейнер прокручується по горизонталі на вузьких екранах. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border bg-card shadow-sm">
      <table className={cn("w-full border-collapse text-left text-body", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("border-b border-border bg-muted/50", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&>tr:last-child]:border-b-0", className)} {...props} />;
}

/** `interactive` — рядок реагує на наведення; сам перехід робить посилання з класом `row-link` у першій комірці. */
export function TableRow({ className, interactive = false, ...props }: ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      className={cn("relative border-b border-border transition-ui", interactive && "hover:bg-state-hover", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn("h-8 px-4 text-meta font-medium whitespace-nowrap text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("h-11 px-4 align-middle", className)} {...props} />;
}

/** Посилання на весь рядок: псевдоелемент розтягується на найближчий `relative` — рядок `TableRow`. */
export const rowLinkClass =
  "font-medium text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring focus-visible:outline-none";
