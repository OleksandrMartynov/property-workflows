"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { EyeIcon, PencilIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";

type Mode = "edit" | "preview";

const ModeContext = createContext<{ mode: Mode; setMode: (mode: Mode) => void } | null>(null);

/**
 * Режим редактора «Edit / Preview» — клієнтський стан: сервер віддає обидві панелі одразу, перемикання миттєве, без
 * запиту й без перерендеру редактора (раніше кожне перемикання — router.replace і всі запити сторінки заново). Режим
 * лишається в адресі (?view=preview) через history.replaceState: посилання відкриває той самий режим, «назад» не
 * засмічується. Введене в полях редагування не губиться — панель лише ховається.
 */
export function EditorModeProvider({ initial, children }: { initial: Mode; children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(initial);
  const setMode = (next: Mode) => {
    setModeState(next);
    const url = new URL(window.location.href);
    if (next === "preview") url.searchParams.set("view", "preview");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  };
  return <ModeContext value={{ mode, setMode }}>{children}</ModeContext>;
}

function useMode() {
  const context = use(ModeContext);
  if (!context) throw new Error("EditorModeProvider is missing");
  return context;
}

/** Панель одного режиму: невидима панель лишається в DOM (`hidden`), тож стан форм і фокусу між перемиканнями живий. */
export function ModePane({ mode, className, children }: { mode: Mode; className?: string; children: ReactNode }) {
  const { mode: active } = useMode();
  return (
    <div hidden={active !== mode} data-mode={mode} className={className}>
      {children}
    </div>
  );
}

export function ModeSwitch() {
  const { mode, setMode } = useMode();
  return (
    <Segmented
      aria-label="Editor mode"
      size="sm"
      value={mode}
      onValueChange={(next) => setMode(next === "preview" ? "preview" : "edit")}
      options={[
        { value: "edit", label: "Edit", icon: <PencilIcon /> },
        { value: "preview", label: "Preview", icon: <EyeIcon /> },
      ]}
    />
  );
}
