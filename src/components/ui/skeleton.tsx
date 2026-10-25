import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Заглушка на час завантаження: форма майбутнього змісту, м'який блиск (без руху за reduced motion). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("skeleton rounded-sm", className)} {...props} />;
}
