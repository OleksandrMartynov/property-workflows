"use client";

import { useEffect, type ReactNode } from "react";
import { Alert } from "./alert";

/**
 * Відгук на дію, що прийшов параметром адреси після серверної дії (`?done=…`, `?error=…`): показується один раз і
 * прибирає ці параметри з адреси, щоб повідомлення не поверталось після перезавантаження чи «назад». Помилка —
 * `role="alert"` (Alert), успіх — у `aria-live="polite"`. `quiet` — лише для скрінрідера: видимий відгук уже дає
 * сама сторінка (наприклад, задача стала «done»).
 */
export function FlashNotice({ kind, clear, quiet = false, children }: { kind: "error" | "success"; clear: string[]; quiet?: boolean; children: ReactNode }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const name of clear) {
      if (url.searchParams.has(name)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [clear]);

  if (quiet) {
    return (
      <p role="status" aria-live="polite" className="sr-only">
        {children}
      </p>
    );
  }
  return <Alert variant={kind}>{children}</Alert>;
}
