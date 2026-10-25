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

/**
 * Автор версії: email адміністратора. «Initial data» — лише версія без автора (початкові дані зрізу 1, ADR 0006); якщо
 * автор є, а email у профілі порожній, показуємо його id, а не «Initial data».
 */
export const versionAuthor = (savedBy: string | null, email: string | null | undefined) =>
  savedBy === null ? "Initial data" : (email ?? savedBy);

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
      author: versionAuthor(v.saved_by, v.saved_by ? emailOf.get(v.saved_by) : null),
    }));
}

/** Назва секції чи задачі: вільний текст без пробілів на краях, не порожній (довжину PM не обмежує). */
export function cleanName(raw: FormDataEntryValue | null): string | null {
  const name = String(raw ?? "").trim();
  return name ? name : null;
}
