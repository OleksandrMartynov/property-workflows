// Куди повернути користувача після входу (AC-DSYS-08). `next` приходить із адреси чи прихованого поля форми, тобто від
// користувача: пропускаємо лише відносний шлях цього самого сайту, інакше вхід став би «відкритим перенаправленням»
// на чужий сайт (`//evil.example`, `https://evil.example`, `/\evil.example`).

const FALLBACK = "/";
// Керівні символи (разом із табуляцією й переносами, які браузер викидає з адреси) — підозріло завжди.
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Безпечний `next`: починається з одного `/`, без `//`, `/\`, схеми й керівних символів; інакше `/`. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return FALLBACK;
  if (CONTROL.test(value)) return FALLBACK;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return FALLBACK;
  // Розбір відносно фіктивного походження: якщо результат веде на інше походження, це не локальний шлях. Повертаємо
  // РОЗІБРАНИЙ шлях, а не сирий рядок (відгук викладача до WS10, пункт 1): `/a/..//evil.example/x` проходить перевірку
  // походження, але після нормалізації стає `//evil.example/x`, і клієнтський роутер Next повів би на інший хост.
  try {
    const base = "http://local.invalid";
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith("//") || url.pathname.includes("\\")) return FALLBACK;
    return url.pathname + url.search + url.hash;
  } catch {
    return FALLBACK;
  }
}

/** Адреса входу з `next` (лише для безпечного шляху, не для кореня): `/login?next=%2Fruns%2F…`. */
export function loginPath(next?: string | null): string {
  const target = safeNext(next);
  return target === FALLBACK ? "/login" : `/login?next=${encodeURIComponent(target)}`;
}

/** Заголовок, яким proxy передає серверним компонентам, куди вело посилання (для redirect на /login?next=…). */
export const NEXT_PATH_HEADER = "x-pw-next";

/** Куди вело посилання: шлях і query без службового `_rsc` (Next додає його до запитів навігації). */
export function returnPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("_rsc");
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}
