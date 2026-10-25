import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Плаваюча смуга збереження (патерн «contextual save bar»): з'являється, лише коли є що зберегти, і тримає головну
 * дію екрана біля нижнього краю, поки сторінка прокручується. Інверсна поверхня (`foreground` / `background`) —
 * найпомітніший шар екрана в обох темах; кнопка дії — `default`. Текст — статус і короткий підсумок, без пояснень.
 */
export function SaveBar({
  icon,
  title,
  detail,
  label,
  className,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** Підпис області для читача екрана. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="region" aria-label={label} className={cn("pointer-events-none sticky bottom-4 z-30 flex justify-center", className)}>
      <div className="pointer-events-auto flex w-full max-w-3xl animate-ui-rise flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-foreground py-2.5 pr-2.5 pl-3 text-background shadow-(--elevation-3)">
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background/10" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-label">{title}</span>
          {detail ? <span className="text-meta break-words text-background/70">{detail}</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
