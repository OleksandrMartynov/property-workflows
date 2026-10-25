"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Статус задачі: порожнє кільце → зелене коло з галочкою. Коли `done` змінюється з false на true вже на сторінці
 * (після підтвердженої дії сервера), коло «підстрибує», а галочка домальовується; при першому показі — без руху.
 */
export function TaskCheck({ done, className }: { done: boolean; className?: string }) {
  const [prev, setPrev] = useState(done);
  const [pulse, setPulse] = useState(0);
  // Реакція на зміну пропса під час рендеру (рекомендований React патерн «скоригувати стан за пропсом»).
  if (done !== prev) {
    setPrev(done);
    if (done) setPulse((p) => p + 1);
  }

  return (
    <svg
      key={pulse}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-status-todo-mark", done && pulse > 0 && "animate-ui-pop", className)}
    >
      {done ? (
        <>
          <circle cx="8" cy="8" r="7" className="fill-status-done-mark" />
          <path
            d="M4.8 8.2l2.2 2.2 4.2-4.6"
            pathLength={1}
            className={cn("stroke-background", pulse > 0 && "animate-ui-draw")}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={pulse > 0 ? undefined : { strokeDasharray: 1 }}
          />
        </>
      ) : (
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.4 2.2" />
      )}
    </svg>
  );
}
