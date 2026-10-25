// Календарні дати як рядки `YYYY-MM-DD` (ключі). Уся арифметика — в UTC: ключ не залежить від часового поясу машини
// і від переходу на літній час. «Сьогодні» — завжди за Europe/Kyiv.

export const KYIV_TZ = "Europe/Kyiv";

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function toKey(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** Розбирає ключ; `null`, якщо формат хибний або такої дати немає (30 лютого). */
export function parseKey(key: string | null | undefined): YMD | null {
  const match = KEY_RE.exec(key ?? "");
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export const isValidKey = (key: string | null | undefined): key is string => parseKey(key) !== null;

const utc = (key: string) => {
  const p = parseKey(key);
  if (!p) throw new RangeError(`Invalid date key: ${key}`);
  return Date.UTC(p.y, p.m - 1, p.d);
};
const fromUtc = (ms: number) => {
  const dt = new Date(ms);
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
};

export function addDays(key: string, n: number): string {
  return fromUtc(utc(key) + n * 86_400_000);
}

export function startOfMonth(key: string): string {
  const p = parseKey(key)!;
  return toKey(p.y, p.m, 1);
}

/** Зсув на n місяців із збереженням дня; якщо дня немає в новому місяці (31 → 30), бере останній. */
export function addMonthsKeep(key: string, n: number): string {
  const p = parseKey(key)!;
  const total = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return toKey(y, m, Math.min(p.d, daysInMonth(y, m)));
}

/** Перше число місяця зі зсувом на n місяців. */
export const addMonths = (key: string, n: number) => startOfMonth(addMonthsKeep(startOfMonth(key), n));

/** Пн = 0 … Нд = 6. */
export function weekdayIndex(key: string): number {
  return (new Date(utc(key)).getUTCDay() + 6) % 7;
}

export const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

export const clampKey = (key: string, min?: string, max?: string) => (min && key < min ? min : max && key > max ? max : key);
export const outOfRange = (key: string, min?: string, max?: string) => Boolean((min && key < min) || (max && key > max));

/** Сітка місяця 6 × 7 (пн–нд), з днями сусідніх місяців на краях. */
export function monthGrid(monthKey: string): string[][] {
  const first = startOfMonth(monthKey);
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 6 }, (_, row) => Array.from({ length: 7 }, (_, col) => addDays(start, row * 7 + col)));
}

// --- Формат ---

/** «24 Oct 2026» (назви місяців — власні, не залежать від версії ICU). */
export function formatDate(key: string): string {
  const p = parseKey(key);
  return p ? `${p.d} ${MONTH_SHORT[p.m - 1]} ${p.y}` : "";
}
export function formatShort(key: string): string {
  const p = parseKey(key);
  return p ? `${p.d} ${MONTH_SHORT[p.m - 1]}` : "";
}
/** «Friday, 23 October 2026» — для підписів клітинок календаря. */
export function formatLong(key: string): string {
  const p = parseKey(key);
  return p ? `${WEEKDAY_NAMES[weekdayIndex(key)]}, ${p.d} ${MONTH_NAMES[p.m - 1]} ${p.y}` : "";
}
export function formatMonth(key: string): string {
  const p = parseKey(key);
  return p ? `${MONTH_NAMES[p.m - 1]} ${p.y}` : "";
}

// --- Europe/Kyiv ---

let dayFormatter: Intl.DateTimeFormat | undefined;
/** Сьогоднішня дата в Києві (не за поясом машини). */
export function todayKey(now: Date = new Date()): string {
  dayFormatter ??= new Intl.DateTimeFormat("en-CA", { timeZone: KYIV_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(dayFormatter.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

let zoneFormatter: Intl.DateTimeFormat | undefined;
/** Скорочена назва пояса Києва на дату: «GMT+3» влітку, «GMT+2» узимку. */
export function kyivZoneName(key: string = todayKey()): string {
  zoneFormatter ??= new Intl.DateTimeFormat("en", { timeZone: KYIV_TZ, timeZoneName: "short" });
  const noon = utc(isValidKey(key) ? key : todayKey()) + 12 * 3_600_000;
  return zoneFormatter.formatToParts(new Date(noon)).find((p) => p.type === "timeZoneName")?.value ?? "GMT+3";
}

// --- Розбір тексту ---

const monthIndex = (word: string) => MONTH_SHORT.findIndex((m) => m.toLowerCase() === word.slice(0, 3));

/**
 * Розбирає введений текст у ключ: `""` — порожньо, `null` — не вдалося розпізнати.
 * Розуміє: today, tomorrow, yesterday, next week, «24 Oct», «Oct 24», «24 Oct 2026», «24.10.2026», «24/10», ISO.
 * Без року — рік `today`.
 */
export function parseDateInput(text: string, today: string): string | null {
  const s = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return "";
  if (s === "today") return today;
  if (s === "tomorrow") return addDays(today, 1);
  if (s === "yesterday") return addDays(today, -1);
  if (s === "next week") return addDays(today, 7);
  let y = parseKey(today)?.y ?? new Date().getUTCFullYear();
  let m: number;
  let d: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[ ./-]+([a-z]{3,9})\.?(?:[ ./,-]+(\d{4}))?$/.exec(s))) {
    d = Number(match[1]);
    m = monthIndex(match[2]) + 1;
    if (match[3]) y = Number(match[3]);
  } else if ((match = /^([a-z]{3,9})\.? (\d{1,2})(?:,? (\d{4}))?$/.exec(s))) {
    m = monthIndex(match[1]) + 1;
    d = Number(match[2]);
    if (match[3]) y = Number(match[3]);
  } else if ((match = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/.exec(s))) {
    d = Number(match[1]);
    m = Number(match[2]);
    if (match[3]) y = Number(match[3]);
  } else {
    return null;
  }
  if (m < 1 || m > 12 || y < 1000) return null;
  const key = toKey(y, m, d);
  return isValidKey(key) ? key : null;
}

// --- Пресети ---

export interface DatePreset {
  label: string;
  value: string;
}
export interface RangePreset {
  label: string;
  start: string;
  end: string;
}

export function datePresets(today: string): DatePreset[] {
  return [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "Next week", value: addDays(today, 7) },
  ];
}

export function rangePresets(today: string): RangePreset[] {
  const monday = addDays(today, -weekdayIndex(today));
  const monthStart = startOfMonth(today);
  const nextMonthStart = addMonths(today, 1);
  return [
    { label: "This week", start: monday, end: addDays(monday, 6) },
    { label: "Next 7 days", start: today, end: addDays(today, 6) },
    { label: "Next week", start: addDays(monday, 7), end: addDays(monday, 13) },
    { label: "This month", start: monthStart, end: addDays(nextMonthStart, -1) },
  ];
}
