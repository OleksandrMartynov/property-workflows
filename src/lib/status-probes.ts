import "server-only";
// Запити сторінки статусу (WS11): кожен компонент — один дешевий запит із тайм-аутом, усі паралельно. Без секретів і
// даних користувачів: публічний ключ Supabase, публічний список моделей OpenRouter (ключ не потрібен, ліміту моделей не
// витрачає) і лише ознака «ключ AI задано». Класифікація — чисті функції в src/lib/status.ts.
import { createClient } from "@supabase/supabase-js";
import { PRODUCT_MODELS } from "@/lib/ai/models";
import { aiConfigured } from "@/lib/ai/openrouter";
import { classifyDbProbe } from "@/lib/health";
import type { Database } from "@/lib/supabase/database.types";
import { aiComponent, appComponent, authComponent, databaseComponent, overallStatus, type StatusReport } from "./status";

/** Довше за це перевірка не чекає: сторінка статусу має відкриватися й тоді, коли компонент «висить». */
const TIMEOUT_MS = 4_000;
const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";

const withTimeout = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });

async function timed<T>(probe: () => Promise<T>): Promise<{ value: T | null; ms: number }> {
  const started = performance.now();
  try {
    return { value: await probe(), ms: Math.round(performance.now() - started) };
  } catch {
    return { value: null, ms: Math.round(performance.now() - started) };
  }
}

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

async function probeDatabase() {
  // Той самий запит, що й /api/health: anon без прав на profiles (42501) — база відповіла.
  const supabase = createClient<Database>(supabaseUrl(), publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: withTimeout },
  });
  const { value, ms } = await timed(async () => {
    const { error, status } = await supabase.from("profiles").select("id").limit(1);
    return classifyDbProbe({ status, error });
  });
  return databaseComponent(value ?? { db: "down", reason: "exception" }, value ? ms : null);
}

async function probeAuth() {
  const { value, ms } = await timed(async () => (await withTimeout(`${supabaseUrl()}/auth/v1/health`, { headers: { apikey: publishableKey() } })).status);
  return authComponent(value ?? 0, value === null ? null : ms);
}

async function probeAi() {
  if (!aiConfigured()) return aiComponent({ configured: false, chain: PRODUCT_MODELS, available: null, ms: null });
  const { value, ms } = await timed(async () => {
    const res = await withTimeout(OPENROUTER_MODELS);
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { id: string }[] };
    return (body.data ?? []).map((m) => m.id);
  });
  return aiComponent({ configured: true, chain: PRODUCT_MODELS, available: value, ms: value ? ms : null });
}

export async function checkStatus(now: () => Date = () => new Date()): Promise<StatusReport> {
  const app = appComponent(process.env.VERCEL_GIT_COMMIT_SHA ?? "local", process.env.VERCEL_ENV ?? "local");
  const components = [app, ...(await Promise.all([probeDatabase(), probeAuth(), probeAi()]))];
  return { ...overallStatus(components), components, checkedAt: now().toISOString() };
}
