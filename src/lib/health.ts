// D0: чи відповіла база на запит /api/health. Чиста функція — щоб перевірити всі гілки тестом без мережі.
// Запит — публічним ключем до таблиці без доступу для anon: «немає прав» (42501) теж означає, що Postgres живий.

/** Код SQLSTATE Postgres, напр. 42501 «permission denied»: запит дійшов до бази. */
const SQLSTATE = /^[0-9A-Z]{5}$/;
/** PostgREST не може під'єднатися до бази. */
const PGRST_DB_DOWN = /^PGRST00[0-3]$/;
/** Supabase відповідає 540, коли безкоштовний проєкт призупинено (Dashboard → Resume project). */
const SUPABASE_PAUSED = 540;

export type DbProbe = { status: number; error: { code?: string; message?: string } | null };
export type DbHealth = { db: "ok" | "down"; reason: string };

export function classifyDbProbe({ status, error }: DbProbe): DbHealth {
  if (status === SUPABASE_PAUSED) return { db: "down", reason: "paused" };
  const code = error?.code ?? "";
  // Мережа (0) і 5xx — база недоступна, навіть якщо в тілі є SQLSTATE (53300 — вичерпано з'єднання).
  if (status === 0 || status >= 500) return { db: "down", reason: `status-${status}${code ? `-${code}` : ""}` };
  if (!error || SQLSTATE.test(code) || (code.startsWith("PGRST") && !PGRST_DB_DOWN.test(code))) {
    return { db: "ok", reason: "" };
  }
  if (/api key/i.test(error.message ?? "")) return { db: "down", reason: "invalid-api-key" };
  // 0 — мережа (Supabase недоступний або хибний URL), 5xx, PGRST000–003.
  return { db: "down", reason: `status-${status}${code ? `-${code}` : ""}` };
}

/** Ярлик середовища з APP_ENV — лише короткі латинські слова; значення змінної нікуди більше не потрапляє. */
const APP_ENV = /^[a-z][a-z0-9-]{0,31}$/;

/**
 * WS11: середовище для /api/health. На staging VERCEL_ENV теж «preview», тож гілку staging видно лише за APP_ENV —
 * змінною у Vercel тільки для гілки staging. Не задано (прод, preview, локально) чи не схоже на ярлик — null.
 */
export function appEnvOf(raw: string | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? "";
  return APP_ENV.test(value) ? value : null;
}

// ── WS11, дія з postmortem docs/incidents/2026-11-19-staging-bad-supabase-url.md ────────────────────────────────────
// На дрілі /api/health казав лише «status-0»: запит до бази не дійшов, але чому і що перевірити — невідомо, а в
// журналі Vercel не лишалося жодного рядка. Тепер: причина мережевого збою (dns / refused / timeout / tls) і НАЗВА
// змінної, яку варто перевірити. Значень змінних і хоста у відповіді немає.

/** Змінні, без яких /api/health не може навіть спробувати запит до бази. */
export const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const;

/** Яких обов'язкових змінних немає (лише назви). */
export function missingEnv(env: Readonly<Record<string, string | undefined>>): string[] {
  return REQUIRED_ENV.filter((name) => !env[name]?.trim());
}

export type NetworkCause = "dns" | "refused" | "timeout" | "tls" | "network";

const CAUSES: [RegExp, NetworkCause][] = [
  [/^(ENOTFOUND|EAI_AGAIN)$/, "dns"],
  [/^(ECONNREFUSED|ECONNRESET)$/, "refused"],
  [/^(ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|TimeoutError|AbortError)$/, "timeout"],
  [/^(CERT_|ERR_TLS|DEPTH_ZERO|UNABLE_TO_VERIFY|SELF_SIGNED)/, "tls"],
];

/** Помилка fetch → вид мережевого збою за кодом причини (undici кладе його в error.cause.code). */
export function networkCause(error: unknown): NetworkCause {
  const e = error as { name?: string; code?: string; cause?: { code?: string; name?: string } } | null;
  const code = e?.cause?.code ?? e?.code ?? e?.cause?.name ?? e?.name ?? "";
  return CAUSES.find(([re]) => re.test(code))?.[1] ?? "network";
}

/** Яку змінну перевірити за причиною збою; null — справа не в змінних (пауза бази, 5xx Supabase). */
export function suspectEnv(reason: string): string | null {
  if (reason.startsWith("unreachable-")) return "NEXT_PUBLIC_SUPABASE_URL";
  if (reason === "invalid-api-key") return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  return null;
}
