/** Склеює класи, пропускаючи порожні значення. Конфлікти утиліт не вирішує: компонент не дає зовнішньому className перебивати власні. */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
