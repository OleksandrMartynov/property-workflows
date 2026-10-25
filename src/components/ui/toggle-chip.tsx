"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";

/**
 * Позначка-перемикач у рядку списку («required» / «optional»): справжній `<input type="checkbox">` усередині, тож
 * значення йде у форму під `name`, працюють Space і фокус з клавіатури. Вигляд виводиться з `:checked` самого поля
 * (без власного стану), тож після скидання форми (React 19 скидає неконтрольовані поля після server action) мітка
 * завжди збігається з полем. Увімкнена — тло `state-selected`, текст `primary` і галочка (не лише колір); вимкнена —
 * тонка межа й приглушений текст. `submitOnChange` надсилає форму одразу після зміни (миттєва дія, як `Switch`);
 * поки форма надсилається, позначка недоступна.
 */
export function ToggleChip({
  onLabel,
  offLabel,
  submitOnChange = false,
  className,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type" | "size" | "children"> & {
  onLabel: ReactNode;
  offLabel: ReactNode;
  submitOnChange?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <label
      className={cn(
        "group/chip relative inline-flex h-6 shrink-0 cursor-pointer select-none items-center gap-1 rounded-full border border-border px-2 text-meta font-medium whitespace-nowrap text-muted-foreground transition-ui press has-checked:border-transparent has-checked:bg-state-selected has-checked:text-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring [&:not(:has(:checked))]:hover:bg-state-hover [&:not(:has(:checked))]:hover:text-foreground",
        pending && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        disabled={pending || props.disabled}
        onChange={(event) => {
          onChange?.(event);
          if (submitOnChange) event.currentTarget.form?.requestSubmit();
        }}
        {...props}
      />
      <span className="hidden items-center gap-1 group-has-checked/chip:inline-flex">
        <CheckIcon className="size-3" />
        {onLabel}
      </span>
      <span className="group-has-checked/chip:hidden">{offLabel}</span>
    </label>
  );
}
