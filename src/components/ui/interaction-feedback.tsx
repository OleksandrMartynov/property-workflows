"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./feedback.css";

const CLICKABLE = "button, a[href], [role='button'], [role='option'], [role='menuitem'], [role='tab'], summary, label[for]";

/**
 * Видимий відгук на дію: (1) кожен клік по кнопці, посиланню, пункту списку дає пульс-кільце на 0,5 с (`data-clicked`);
 * (2) клік по внутрішньому посиланню запускає смугу прогресу зверху, яка добігає до кінця, коли адреса змінилась.
 * Не заважає клавіатурі й скрінрідерам: смуга `aria-hidden`; за `prefers-reduced-motion` лишається статичний контур.
 */
export function InteractionFeedback() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const timers = useRef<number[]>([]);
  const [prevPath, setPrevPath] = useState(pathname);

  useEffect(() => {
    const clear = (el: Element) => window.setTimeout(() => el.removeAttribute("data-clicked"), 560);
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const el = event.target.closest(CLICKABLE);
      if (!el || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      el.removeAttribute("data-clicked");
      void (el as HTMLElement).offsetWidth; // перезапуск анімації, якщо клікнули знову
      el.setAttribute("data-clicked", "");
      timers.current.push(clear(el));
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      const url = new URL((link as HTMLAnchorElement).href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setState("running");
      timers.current.push(window.setTimeout(() => setState("idle"), 12000));
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("click", onClick, true);
    const pending = timers.current;
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("click", onClick, true);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Адреса змінилась — довести смугу до кінця й сховати (стан виводимо під час рендеру).
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (state === "running") setState("done");
  }
  useEffect(() => {
    if (state !== "done") return;
    const id = window.setTimeout(() => setState("idle"), 460);
    return () => window.clearTimeout(id);
  }, [state]);

  return state === "idle" ? null : <div aria-hidden="true" className="route-progress" data-state={state} />;
}
