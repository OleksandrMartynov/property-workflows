"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ClockIcon } from "@/components/ui/icons";
import { SaveBar } from "@/components/ui/save-bar";
import { SubmitButton } from "@/app/_components/submit-button";
import { saveVersion } from "../actions";

/**
 * Смуга збереження редактора: видно, лише коли є «Unpublished changes» (AC-EDITOR-01). «Save» створює версію
 * (AC-EDITOR-03; відмова AC-EDITOR-04 — повідомленням над редактором). ⌘S / Ctrl S — те саме, що «Save», але якщо у
 * фокусі змінене поле редактора (InlineInput), перше натискання лише зберігає це поле: інакше версія взяла б стару
 * назву, а введене зникло б після переходу. Наступне натискання зберігає версію.
 */
export function PublishBar({ templateId, lines }: { templateId: string; lines: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  // Підказка клавіш: на сервері й на Mac — «⌘S», на інших системах — «Ctrl S».
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iP(hone|ad|od)/.test(navigator.userAgent),
    () => true,
  );
  const shortcut = mac ? "⌘S" : "Ctrl S";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const active = document.activeElement;
        if (active instanceof HTMLInputElement && active.dataset.inlineCommit && active.form !== form.current && (active.value.trim() || active.dataset.inlineEmpty) && active.value !== active.defaultValue) {
          if (active.dataset.inlineCommit === "blur") active.blur();
          else active.form?.requestSubmit();
          return;
        }
        form.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SaveBar label="Save version" icon={<ClockIcon />} title="Unpublished changes" detail={lines.length ? lines.join(" · ") : undefined}>
      <form ref={form} action={saveVersion}>
        <input type="hidden" name="template_id" value={templateId} />
        <SubmitButton pendingText="Saving…" size="lg">
          Save
          <kbd className="ml-1 hidden rounded-xs bg-primary-foreground/15 px-1 font-sans text-meta md:inline" aria-hidden="true">
            {shortcut}
          </kbd>
        </SubmitButton>
      </form>
    </SaveBar>
  );
}
