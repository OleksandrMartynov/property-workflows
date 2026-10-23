// «Недавні запуски» для бічної панелі: лише в браузері користувача (localStorage), без сервера. Зручність, не дані:
// якщо сховище недоступне, список просто порожній. Очищується при виході.

export interface RecentRun {
  id: string;
  name: string;
}

const KEY = "pw-recent-runs";
const EVENT = "pw-recent-runs";
const LIMIT = 4;

export function readRecentRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseRecent(raw: string): RecentRun[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((r) => r && typeof r.id === "string" && typeof r.name === "string").slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function pushRecent(entry: RecentRun) {
  try {
    const next = [entry, ...parseRecent(readRecentRaw()).filter((r) => r.id !== entry.id)].slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* сховище недоступне — нічого не робимо */
  }
}

export function clearRecent() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* сховище недоступне */
  }
}

export function subscribeRecent(notify: () => void) {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
