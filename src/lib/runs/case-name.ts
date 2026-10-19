// Назва випадку (Case): довільний текст 1–100 символів; назва лише з пробілів — порожня (припущення PM, вимога #2).
// Пробіли на краях обрізаємо й межу рахуємо після обрізання — робоче припущення Q3 (docs/spec-reading.md).
// Ті самі правила перевіряє функція бази launch_run (останні ворота за server action).
import { CASE_NAME_MAX_LENGTH, type ErrorCode } from "./messages";

export type CaseNameResult = { ok: true; value: string } | { ok: false; error: ErrorCode };

export function validateCaseName(raw: unknown): CaseNameResult {
  const value = typeof raw === "string" ? raw.trim() : "";
  // AC-RUN-03
  if (value === "") return { ok: false, error: "CASE_NAME_REQUIRED" };
  // AC-RUN-07: довжина в символах Unicode, як char_length у Postgres.
  if ([...value].length > CASE_NAME_MAX_LENGTH) return { ok: false, error: "CASE_NAME_TOO_LONG" };
  return { ok: true, value };
}
