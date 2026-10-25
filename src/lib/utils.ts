/** Чи задав споживач власний розмір утилітою `size-*` (тоді базовий розмір компонента не додаємо: `cn` не розв'язує
 * конфлікти утиліт, і переможця визначав би порядок правил у CSS). */
export const hasSizeClass = (className?: string) => /(^|\s)size-/.test(className ?? "");

/** Склеює класи, пропускаючи порожні значення. Конфлікти утиліт не вирішує: компонент не дає зовнішньому className перебивати власні. */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
