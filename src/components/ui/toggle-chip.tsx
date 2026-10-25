"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";

/**
 * Позначка-перемикач у рядку списку («required» / «optional»): справжній `<input type="checkbox">` усередині, тож
 * значення йде у форму під `name`, працюють Space і фокус з клавіатури. Увімкнена — тло `state-selected`, текст
 * `primary` і галочка (не лише колір); вимкнена — тонка межа й приглушений текст. `submitOnChange` надсилає форму
 * одразу після зміни (миттєва дія, як `Switch`); поки форма надсилається, позначка недоступна.
 */
export function ToggleChip({
  onLabel,
  offLabel,
  defaultChecked = false,
  submitOnChange = false,
  className,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type" | "size" | "children"> & {
  onLabel: ReactNode;
  offLabel: ReactNode;
  submitOnChange?: boolean;
}) {
  const [on, setOn] = useState(Boolean(defaultChecked));
  const { pending } = useFormStatus();

  return (
    <label
      className={cn(
        "relative inline-flex h-6 shrink-0 cursor-pointer select-none items-center gap-1 rounded-full border px-2 text-meta font-medium whitespace-nowrap transition-ui press has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
        on ? "border-transparent bg-state-selected text-primary" : "border-border text-muted-foreground hover:bg-state-hover hover:text-foreground",
        pending && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        defaultChecked={defaultChecked}
        disabled={pending || props.disabled}
        onChange={(event) => {
          onChange?.(event);
          setOn(event.currentTarget.checked);
          if (submitOnChange) event.currentTarget.form?.requestSubmit();
        }}
        {...props}
      />
      {on ? <CheckIcon className="size-3" /> : null}
      {on ? onLabel : offLabel}
    </label>
  );
}
