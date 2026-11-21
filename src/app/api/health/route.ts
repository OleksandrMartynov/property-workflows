// D0: публічна перевірка здоров'я проду — GET /api/health → { ok, sha, env, appEnv, supabaseRef, db, reason, check }.
// WS11: appEnv — середовище з APP_ENV (Vercel, лише гілка staging): на staging VERCEL_ENV теж «preview».
// WS11, staging з окремою базою: supabaseRef — ref проєкту Supabase з публічної адреси бази (не секрет): прод і
// staging (та PR-preview) мають показувати різні.
// WS11, дія з postmortem docs/incidents/2026-11-19-staging-bad-supabase-url.md: замість «status-0» — причина мережевого
// збою (unreachable-dns / -refused / -timeout / -tls) і check — НАЗВА змінної, яку варто перевірити; при збої — один
// рядок health.db_down у журналі Vercel. Значень змінних і хоста ніде немає.
// Без секретів і без даних користувачів: коміт збірки (Vercel) і чи відповідає база (один дешевий запит публічним
// ключем). Шлях — у PUBLIC_PATHS (src/lib/supabase/proxy.ts), інакше proxy віддав би 307 на /login.
// Читають: scripts/smoke.mjs, .github/workflows/smoke.yml і перевірка розгортань курсу.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appEnvOf, classifyDbProbe, missingEnv, networkCause, supabaseRefOf, suspectEnv } from "@/lib/health";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

/** Скільки чекаємо на уточнювальний запит причини збою (основний запит уже не вдався). */
const CAUSE_TIMEOUT_MS = 3_000;

type Health = { db: "ok" | "down"; reason: string };

/** Запит до бази не дійшов — з'ясовуємо чому одним коротким запитом до того самого хоста (без ключа). */
async function unreachableReason(url: string): Promise<string> {
  try {
    await fetch(new URL("/auth/v1/health", url), { signal: AbortSignal.timeout(CAUSE_TIMEOUT_MS), cache: "no-store" });
    // Хост відповів на другий запит — перший був мережевим збоєм без стійкої причини.
    return "unreachable-network";
  } catch (error) {
    return `unreachable-${networkCause(error)}`;
  }
}

async function probeDb(): Promise<Health> {
  const missing = missingEnv(process.env);
  if (missing.length) return { db: "down", reason: "missing-env" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  try {
    // Звичайний supabase-js, не @/lib/supabase/server: перевірка не читає cookie відвідувача.
    const supabase = createClient<Database>(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // GET, не HEAD: потрібне тіло помилки, щоб відрізнити «anon без прав» (база відповіла) від «хибний ключ».
    const { error, status } = await supabase.from("profiles").select("id").limit(1);
    const health = classifyDbProbe({ status, error });
    // 0 — supabase-js не отримав HTTP-відповіді: хост недоступний (хибний URL, DNS, мережа).
    return status === 0 ? { db: "down", reason: await unreachableReason(url) } : health;
  } catch {
    // Невалідний URL (createClient кидає виняток) — теж змінна.
    return { db: "down", reason: "invalid-env" };
  }
}

export async function GET() {
  // VERCEL_GIT_COMMIT_SHA є, коли у Vercel увімкнено «Automatically expose System Environment Variables» (типово так).
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const env = process.env.VERCEL_ENV ?? "local";
  const appEnv = appEnvOf(process.env.APP_ENV);
  const supabaseRef = supabaseRefOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const health = await probeDb();
  const check =
    health.reason === "missing-env" ? missingEnv(process.env).join(",") : health.reason === "invalid-env" ? "NEXT_PUBLIC_SUPABASE_URL" : suspectEnv(health.reason);
  if (health.db !== "ok") {
    // Один рядок у Runtime Logs Vercel (на Hobby — 1 година): причина й назва змінної, без значень і хоста.
    console.error(JSON.stringify({ event: "health.db_down", reason: health.reason, check, env, appEnv, sha: sha.slice(0, 7) }));
  }
  return NextResponse.json(
    { ok: health.db === "ok", sha, env, appEnv, supabaseRef, ...health, ...(check ? { check } : {}) },
    { status: health.db === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
