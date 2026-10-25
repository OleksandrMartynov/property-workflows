"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Секція редактора, що згортається (як групи в Linear і секції в Todoist): шеврон зліва від назви, `aria-expanded`
 * і `aria-controls`; згорнута секція ховає задачі, але лишає назву, лічильник і дії. Вміст рендерить сервер.
 */
export function CollapsibleSection({ name, header, children }: { name: string; header: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <>
      <div className="group/item flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 size-6 text-muted-foreground hover:text-foreground"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`${open ? "Collapse" : "Expand"} section ${name}`}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronRightIcon className={cn("size-3.5 transition-transform duration-(--duration-fast)", open && "rotate-90")} />
        </Button>
        {header}
      </div>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </>
  );
}
