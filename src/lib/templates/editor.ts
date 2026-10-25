// Логіка редактора шаблону й списку версій (зріз 2, openspec/specs/template-editor): чисті функції, які викликають
// сторінки й дії — тож їх перевіряють юніт-тести без бази.
import { KYIV_TZ } from "@/lib/dates";

/** AC-EDITOR-05: дата й час збереження версії — за Києвом, DD.MM.YYYY HH:MM, до хвилини. */
export function formatSavedAt(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: KYIV_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Автор версії: email адміністратора; версія з початкових даних зрізу 1 автора не має (ADR 0006). */
export const versionAuthor = (email: string | null | undefined) => email ?? "Initial data";

export interface VersionRow {
  number: number;
  saved_at: string;
  saved_by: string | null;
}

/** AC-EDITOR-05: від новішої до старішої — за номером версії, з датою й email автора. */
export function versionList(rows: readonly VersionRow[], emailOf: ReadonlyMap<string, string | null>) {
  return [...rows]
    .sort((a, b) => b.number - a.number)
    .map((v) => ({
      label: `Version ${v.number}`,
      savedAt: formatSavedAt(v.saved_at),
      author: versionAuthor(v.saved_by ? (emailOf.get(v.saved_by) ?? null) : null),
    }));
}

export interface Positioned {
  id: string;
  position: number;
}

/**
 * Переміщення вгору чи вниз: нові позиції двох сусідів (обмін місцями). На краю — порожньо, нічого не змінюємо.
 * Порядок секцій і задач — частина версії (AC-RUN-12, AC-TASK-12).
 */
export function swapWithNeighbour(items: readonly Positioned[], id: string, direction: "up" | "down"): Positioned[] {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  const i = ordered.findIndex((x) => x.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ordered.length) return [];
  return [
    { id: ordered[i].id, position: ordered[j].position },
    { id: ordered[j].id, position: ordered[i].position },
  ];
}

/** Наступна позиція в кінці списку. */
export const nextPosition = (items: readonly { position: number }[]) => items.reduce((max, x) => Math.max(max, x.position), 0) + 1;

/** Назва секції чи задачі: вільний текст без пробілів на краях, не порожній (довжину PM не обмежує). */
export function cleanName(raw: FormDataEntryValue | null): string | null {
  const name = String(raw ?? "").trim();
  return name ? name : null;
}
