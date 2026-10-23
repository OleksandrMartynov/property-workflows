"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "./input";

/** Пошукове поле: лупа зліва, «очистити» справа (з'являється з текстом), Esc теж очищає. Працює і керованим (`value`), і некерованим. */
export function SearchInput({
  value,
  defaultValue = "",
  onValueChange,
  "aria-label": ariaLabel = "Search",
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "leading" | "trailing" | "clearable" | "clearLabel" | "value" | "defaultValue" | "onChange"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const set = (next: string) => {
    setInternal(next);
    onValueChange?.(next);
  };

  return (
    <Input
      {...props}
      type="search"
      role="searchbox"
      aria-label={ariaLabel}
      autoComplete="off"
      clearable
      clearLabel="Clear search"
      value={current}
      onChange={(event) => set(event.target.value)}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.key === "Escape" && current) {
          event.preventDefault();
          set("");
        }
      }}
      leading={
        <svg viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      }
    />
  );
}
