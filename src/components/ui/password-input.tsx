"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldHeight, Input } from "./input";

/** Око: пароль приховано — перекреслене, показано — відкрите. Риска домальовується переходом. */
function EyeGlyph({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="1.9" className={cn("origin-center transition-transform duration-(--duration-base) ease-standard [transform-box:fill-box]", hidden ? "scale-75" : "scale-100")} />
      <path
        d="M3 13 13 3"
        pathLength={1}
        className="transition-[stroke-dashoffset] duration-(--duration-base) ease-standard"
        style={{ strokeDasharray: 1, strokeDashoffset: hidden ? 0 : 1 }}
      />
    </svg>
  );
}

function CapsGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="M8 2.5l4.5 5H10v3H6v-3H3.5z" />
      <path d="M6 13.25h4" />
    </svg>
  );
}

/**
 * Поле пароля з кнопкою-оком. Вставка й менеджери паролів працюють (WCAG 3.3.8): onPaste не блокуємо.
 * Перемикання не відриває фокус і не зсуває курсор. `capsIndicator` додає значок Caps Lock у полі (лише візуально:
 * текстове попередження поруч — на боці форми).
 */
export function PasswordInput({
  size = "md",
  capsIndicator = false,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "size" | "trailing" | "clearable"> & { size?: keyof typeof fieldHeight; capsIndicator?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);

  return (
    <Input
      {...props}
      size={size}
      type={visible ? "text" : "password"}
      spellCheck={false}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (capsIndicator) setCaps(event.getModifierState("CapsLock"));
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
        if (capsIndicator) setCaps(event.getModifierState("CapsLock"));
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setCaps(false);
      }}
      trailing={
        <>
          {caps ? (
            <span title="Caps Lock is on" className="ctl-pop grid size-6 place-items-center text-status-due-soon-foreground">
              <CapsGlyph />
            </span>
          ) : null}
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            title={visible ? "Hide password" : "Show password"}
            className="ctl-iconbtn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              const input = event.currentTarget.closest("[data-ctl-input]")?.querySelector("input");
              const start = input?.selectionStart ?? null;
              const end = input?.selectionEnd ?? null;
              const next = !visible;
              if (input) input.type = next ? "text" : "password";
              setVisible(next);
              if (input && document.activeElement === input) {
                try {
                  input.setSelectionRange(start, end);
                } catch {
                  /* тип поля міг не підтримувати виділення */
                }
              }
            }}
          >
            <EyeGlyph hidden={!visible} />
          </button>
        </>
      }
    />
  );
}
