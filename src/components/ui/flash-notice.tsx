"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alert } from "./alert";

/**
 * Прибирає параметри з адреси без перезавантаження. `replaceState(null, …)` — підтримуваний Next.js варіант History
 * API: роутер синхронізує свій URL (useSearchParams), тож прибрані параметри не повертаються з наступним оновленням.
 */
export function useClearSearchParams(names: string[]) {
  const key = names.join(",");
  useEffect(() => {
    const url = new URL(window.location.href);
    const before = url.search;
    for (const name of key.split(",")) url.searchParams.delete(name);
    if (url.search !== before) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [key]);
}

/** Те саме без розмітки — коли відгук показує не FlashNotice, а сторінка (напр. помилка під полем). */
export function ClearSearchParams({ names }: { names: string[] }) {
  useClearSearchParams(names);
  return null;
}

/**
 * Відгук на дію, що прийшов параметром адреси після серверної дії (`?done=…`, `?error=…`): показується один раз і
 * прибирає ці параметри з адреси, щоб повідомлення не поверталось після перезавантаження чи «назад». Помилка —
 * `role="alert"` (Alert), успіх — `role="status"`. `quiet` — лише для скрінрідера: видимий відгук уже дає сама сторінка
 * (наприклад, задача стала «done»); область з'являється порожньою, а текст додається після монтування — так скрінрідер
 * помічає зміну й оголошує її.
 */
export function FlashNotice({ kind, clear, quiet = false, children }: { kind: "error" | "success"; clear: string[]; quiet?: boolean; children: ReactNode }) {
  useClearSearchParams(clear);
  const [announce, setAnnounce] = useState(false);
  useEffect(() => {
    if (!quiet) return;
    const timer = setTimeout(() => setAnnounce(true), 150);
    return () => clearTimeout(timer);
  }, [quiet]);

  if (quiet) {
    return (
      <p role="status" aria-live="polite" className="sr-only">
        {announce ? children : null}
      </p>
    );
  }
  return <Alert variant={kind}>{children}</Alert>;
}
