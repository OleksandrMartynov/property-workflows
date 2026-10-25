import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Підпис поля: завжди `htmlFor` на id поля, placeholder не замінює підпис. `required` додає зірочку (лише візуально). */
export function Label({ className, required, children, ...props }: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label className={cn("text-label font-medium text-foreground", className)} {...props}>
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 font-semibold text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
}
