// Повернення до списку з тими самими виглядом, пошуком і сторінкою. Список (FilterBar) запам'ятовує свою останню
// адресу в sessionStorage вкладки, а посилання «← Runs» на сторінці запуску веде саме туди, а не на голий /runs.
// Лише адреса цього застосунку з тим самим шляхом: чужого чи зовнішнього посилання так не підкласти.

const key = (pathname: string) => `pw.list:${pathname}`;

/** Що запам'ятати: шлях і рядок пошуку списку (без «?», якщо параметрів немає). */
export function listUrl(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

/** Адреса повернення: збережена адреса того самого списку, інакше — сам список. */
export function returnHref(fallback: string, stored: string | null | undefined): string {
  if (!stored) return fallback;
  const [path] = stored.split("?");
  return path === fallback && stored.startsWith("/") && !stored.startsWith("//") ? stored : fallback;
}

export function rememberListUrl(pathname: string, search: string, storage: Pick<Storage, "setItem"> | undefined) {
  try {
    storage?.setItem(key(pathname), listUrl(pathname, search));
  } catch {
    // Приватне вікно чи вимкнене сховище — повернення просто веде на сам список.
  }
}

export function readListUrl(pathname: string, storage: Pick<Storage, "getItem"> | undefined): string | null {
  try {
    return storage?.getItem(key(pathname)) ?? null;
  } catch {
    return null;
  }
}
