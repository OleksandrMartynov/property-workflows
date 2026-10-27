"use client";

import { useCallback, useId, useLayoutEffect, useSyncExternalStore } from "react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  THEME_CHOICES,
  THEME_EVENT,
  THEME_KEY,
  THEME_LABELS,
  applyTheme,
  parseTheme,
  readStoredTheme,
  writeStoredTheme,
  type ThemeChoice,
} from "@/lib/theme";

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

// Запасний стан, коли storage недоступний (приватне вікно): вибір діє до перезавантаження, але перемикач не «глухий».
let fallbackChoice: ThemeChoice | null = null;
const readChoice = (): ThemeChoice => fallbackChoice ?? readStoredTheme(getStorage());

const subscribe = (notify: () => void) => {
  const onStorage = (event: StorageEvent) => {
    // Інша вкладка змінила тему: перемикач і сторінка підхоплюють її без перезавантаження.
    if (event.key === THEME_KEY || event.key === null) {
      // Збережене значення з іншої вкладки головніше за запасний вибір цієї. THEME_EVENT (а не прямий notify) оновлює і
      // перемикач (підписка нижче), і шейдер входу.
      fallbackChoice = null;
      applyTheme(document.documentElement, parseTheme(event.newValue));
      window.dispatchEvent(new Event(THEME_EVENT));
    }
  };
  window.addEventListener(THEME_EVENT, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
};

/** Обрати тему: зберегти на пристрої, застосувати до <html> і повідомити решту інтерфейсу. */
export function chooseTheme(choice: ThemeChoice) {
  fallbackChoice = writeStoredTheme(getStorage(), choice) ? null : choice;
  applyTheme(document.documentElement, choice);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Вбудований скрипт у <head> ставить `data-theme` до малювання, але в dev React (Strict Mode) на повторному монтуванні
 * скидає атрибути <html>. Цей компонент (один на застосунок, у layout.tsx) повертає атрибут до першого малювання.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(document.documentElement, readChoice());
  }, []);
  return null;
}

/** Вибір «Theme»: System (за замовчуванням, слідує за пристроєм), Light, Dark. `compact` — для вузьких місць (вхід). */
export function ThemeSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const labelId = useId();
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  const onValueChange = useCallback((value: string) => chooseTheme(parseTheme(value)), []);

  return (
    <div className={cn(compact ? "flex items-center gap-2" : "flex flex-col gap-1.5", className)}>
      <span id={labelId} className="text-label text-muted-foreground">
        Theme
      </span>
      <Segmented
        aria-labelledby={labelId}
        size={compact ? "sm" : "md"}
        block={!compact}
        value={choice}
        onValueChange={onValueChange}
        options={THEME_CHOICES.map((value) => ({ value, label: THEME_LABELS[value] }))}
      />
    </div>
  );
}
