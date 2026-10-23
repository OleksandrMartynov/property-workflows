"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const EXIT_MS = 100;
const GAP = 6;

interface PopoverProps {
  open: boolean;
  /** Закрити: клік поза поповером і якорем. Esc обробляє компонент-власник (фокус лишається в нього). */
  onDismiss: () => void;
  /** Елемент, під яким з'являється поверхня (поле, кнопка). */
  anchorRef: RefObject<HTMLElement | null>;
  /** За замовчуванням ширина поверхні не менша за якір. */
  matchWidth?: boolean;
  /** Бажана ширина (px), якщо поверхня не має дорівнювати якорю (календар). */
  width?: number;
  align?: "start" | "end";
  id?: string;
  role?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Плаваюча поверхня в шарі `body` (не обрізається `overflow` батьків): позиціюється під якорем, перевертається вгору,
 * коли знизу замало місця, стежить за прокруткою й зміною розміру, закривається кліком поза нею. Вхід і вихід —
 * `data-state` ("open" → "closing"): вихід швидший за вхід, елемент знімається після `EXIT_MS`.
 */
export function Popover({ open, onDismiss, anchorRef, matchWidth = true, width, align = "start", className, children, ...aria }: PopoverProps) {
  const surface = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", left: 0, top: 0, visibility: "hidden" });
  const [up, setUp] = useState(false);

  // Вихід: поверхня лишається в DOM ще EXIT_MS, поки грає анімація (стан виводимо під час рендеру, без ефекту).
  if (open !== wasOpen) {
    setWasOpen(open);
    setExiting(!open);
  }
  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setExiting(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  const mounted = open || exiting;
  const state = open ? "open" : "closing";

  const place = () => {
    const anchor = anchorRef.current;
    const el = surface.current;
    if (!anchor || !el) return;
    const rect = anchor.getBoundingClientRect();
    const height = el.offsetHeight;
    const w = width ?? Math.max(rect.width, el.offsetWidth);
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const above = rect.top - GAP - 8;
    const flip = height > below && above > below;
    const left = align === "end" ? rect.right - w : rect.left;
    setUp(flip);
    setStyle({
      position: "fixed",
      left: Math.max(8, Math.min(left, window.innerWidth - w - 8)),
      top: flip ? Math.max(8, rect.top - GAP - height) : rect.bottom + GAP,
      width: matchWidth || width ? w : undefined,
      maxHeight: Math.max(160, flip ? above : below),
      visibility: "visible",
    });
  };

  useLayoutEffect(() => {
    if (!mounted) return;
    place();
    // Позиція залежить від вмісту: перераховуємо, коли він змінює розмір (фільтр списку, зміна місяця).
    const el = surface.current;
    const observer = el ? new ResizeObserver(place) : undefined;
    if (el) observer?.observe(el);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, width, matchWidth, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (surface.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onDismiss();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, onDismiss, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={surface}
      data-state={state}
      style={{ ...style, "--float-dir": up ? -1 : 1, "--float-origin": up ? "bottom" : "top" } as CSSProperties}
      className={cn("surface-float z-50 flex flex-col overflow-hidden", className)}
      {...aria}
    >
      {children}
    </div>,
    document.body,
  );
}
