// Рух між сторінками на React <ViewTransition> (View Transitions API браузера; Next App Router — без налаштувань).
// Патерни: «той самий об'єкт» — назва з рядка списку морфиться в заголовок сторінки (continuity); скелет іде швидко,
// вміст приходить м'якше (асиметрія виходу й появи). Анімують лише названі елементи: решта сторінки міняється миттєво,
// як і раніше (кореневий кросфейд вимкнено в globals.css), тож щільний робочий інтерфейс не «пливе».
// Усе вимикається за prefers-reduced-motion (globals.css). Браузер без View Transitions — звичайна навігація.
import { ViewTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ім'я морфа для запуску чи шаблону: однакове в рядку списку й у заголовку його сторінки. */
export const morphName = (kind: "run" | "template", id: string) => `${kind}-title-${id}`;

/**
 * Назва, що «перетікає» між сторінками (рядок списку ↔ заголовок). Усередині — текст або поле назви (редактор);
 * `className` — для обгортки поля, якій треба розтягнутись у flex-рядку.
 */
export function SharedTitle({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      <span className={cn("inline-block max-w-full", className)}>{children}</span>
    </ViewTransition>
  );
}

/** Скелет сторінки: при появі змісту швидко згасає вниз. */
export function SkeletonExit({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      {children}
    </ViewTransition>
  );
}

/** Зміст сторінки: з'являється м'яким підйомом, коли змінює скелет чи попередню сторінку. */
export function ContentEnter({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="content-in" default="none">
      {children}
    </ViewTransition>
  );
}
