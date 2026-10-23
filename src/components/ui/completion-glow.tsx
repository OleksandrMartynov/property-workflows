"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i * 137.5 * Math.PI) / 180;
  const distance = 54 + (i % 4) * 20;
  return { dx: Math.round(Math.cos(angle) * distance), dy: Math.round(Math.sin(angle) * distance), delay: (i % 5) * 28, size: i % 3 === 0 ? "size-2" : "size-1.5" };
});

/**
 * Обгортка панелі запуску: коли `complete` стає true на сторінці (остання обов'язкова задача підтверджена),
 * по краю панелі один раз спалахує м'яке зелене світіння (≤ 400 мс), а з `burst` ще й розліталися часточки з
 * `burstOrigin`. При першому показі завершеного запуску — без руху.
 */
export function CompletionGlow({
  complete,
  className,
  rounded = "rounded-md",
  burst = false,
  burstOrigin = "left-1/2 top-1/2",
  burstColors = ["bg-status-done-mark", "bg-primary"],
  children,
}: {
  complete: boolean;
  className?: string;
  rounded?: string;
  burst?: boolean;
  burstOrigin?: string;
  burstColors?: string[];
  children: ReactNode;
}) {
  const [prev, setPrev] = useState(complete);
  const [pulse, setPulse] = useState(0);
  if (complete !== prev) {
    setPrev(complete);
    if (complete) setPulse((p) => p + 1);
  }
  return (
    <div className={cn("relative", className)}>
      {children}
      {pulse > 0 ? <span key={pulse} aria-hidden="true" className={cn("animate-ui-glow pointer-events-none absolute inset-0", rounded)} /> : null}
      {pulse > 0 && burst ? (
        <span key={`b${pulse}`} aria-hidden="true" className={cn("pointer-events-none absolute size-0", burstOrigin)}>
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className={cn("animate-ui-burst absolute -left-1 -top-1 rounded-full", p.size, burstColors[i % burstColors.length])}
              style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--delay": `${p.delay}ms` } as CSSProperties}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
