// Синтетичні дані UAT і прибирання за ними — секретним ключем Supabase (обходить RLS).
// Лише в тестах і лише на машині розробника (.env.local) або в CI на одноразовому локальному стеку (e2e.yml).
// У GitHub Secrets SUPABASE_SECRET_KEY не додаємо. Без ключа (прогін лише AC, що нічого не пишуть,
// --grep-invert '@writes') цей файл нічого не робить: cleanup.teardown.ts не реєструє тест.
// check:boundary сканує src/, тож цей файл його не порушує; у src/ секретний ключ читає лише src/lib/supabase/admin.ts.
// Ніколи не друкуємо значення ключів і паролів — лише адреси синтетичних користувачів.
//
// Джерело: демо-репо курсу, tests/e2e/support/admin.ts (тег ws8-03-uat). Демо-специфічні помічники (createEmployee
// з підрозділом і посадою, isBlockedDay, leaveRequestsOf) прибрано — подивіться їх у демо як зразок для своїх.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ВАШЕ: рядки синтетичного користувача, які треба видалити ДО deleteUser, — таблиці з FK на користувача без
 * on delete cascade (інакше Auth відповідає «Database error deleting user»). У демо: leave_requests.employee_id.
 * Якщо таких таблиць немає (або всі FK — cascade), лишіть порожнім.
 */
// Зріз 3 (UAT підрядника): runs.run_manager_id посилається на profiles без cascade — запуски синтетичного менеджера
// видаляємо (їхні задачі прибирає cascade run_tasks.run_id). Лише запуски, де менеджер — синтетичний користувач.
const OWNED_ROWS: { table: string; column: string }[] = [{ table: "runs", column: "run_manager_id" }];

/**
 * Посилання на синтетичного користувача, які прибирання НЕ видаляє: задачі (run_tasks.assignee_id, done_by) мають
 * лишитися лише в уже видалених запусках синтетичних менеджерів. Знайшлося хоч одне в чужому запуску (менеджер
 * призначив uat-акаунт у справжній запуск) — прибирання зупиняється з переліком запусків, а не видаляє чужі задачі.
 */
const REFERENCED_BY: { table: string; column: string }[] = [
  { table: "run_tasks", column: "assignee_id" },
  { table: "run_tasks", column: "done_by" },
];

/** Лише такі адреси прибирання має право видалити: uat-<run>[-<суфікс>]@example.test. */
export const UAT_EMAIL = /^uat-[0-9a-z-]+@example\.test$/;

export function uatEmail(suffix?: string): string {
  const run = process.env.UAT_RUN ?? "manual";
  const email = `uat-${run}${suffix ? `-${suffix}` : ""}@example.test`;
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична адреса має вигляд uat-…@example.test, а не ${email}`);
  return email;
}

export const randomPassword = () => `Uat-${randomBytes(12).toString("base64url")}`;

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** Клієнт із секретним ключем — для ваших помічників синтетичних даних (створити користувача, прочитати рядок). */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Для синтетичних даних UAT потрібні NEXT_PUBLIC_SUPABASE_URL і SUPABASE_SECRET_KEY (.env.local)");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listUatUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && UAT_EMAIL.test(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

const CLEANUP_LOG = "test-results/uat-cleanup.jsonl";

/** Усі uat-адреси, які видалив цей прогін (за журналом). */
export function deletedThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { deleted: string[] });
  return [...new Set(entries.flatMap((e) => e.deleted))];
}

/** leftoverRequests — скільки рядків видалених користувачів лишилось у таблицях OWNED_ROWS (назва поля — з демо). */
export type CleanupResult = { deleted: string[]; remaining: string[]; leftoverRequests: number };

/**
 * Видаляє ВСІХ uat-*@example.test (і тих, що лишились після обірваних прогонів), а потім перевіряє:
 * жодного такого користувача й жодного їхнього рядка в OWNED_ROWS.
 */
export async function deleteUatUsers(onlyEmail?: string): Promise<CleanupResult> {
  const supabase = adminClient();
  const targets = (await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail);
  const deleted: string[] = [];
  const ids = targets.map((u) => u.id);
  // 1) Рядки, якими володіють синтетичні користувачі (запуски синтетичних менеджерів), — для всіх одразу: задачі
  //    синтетичного підрядника лежать у запусках синтетичного менеджера, тож порядок користувачів не важливий.
  for (const { table, column } of ids.length ? OWNED_ROWS : []) {
    const { error: rowsError } = await supabase.from(table).delete().in(column, ids);
    if (rowsError) throw rowsError;
  }
  // 2) Посилання з чужих рядків — не видаляємо: зупиняємось і кажемо, де вони.
  for (const { table, column } of ids.length ? REFERENCED_BY : []) {
    const { data, error: refError } = await supabase.from(table).select("run_id").in(column, ids);
    if (refError) throw refError;
    if (data?.length) {
      const runs = [...new Set(data.map((row: { run_id: string }) => row.run_id))].join(", ");
      throw new Error(`Синтетичний користувач є в ${table}.${column} чужих запусків (${runs}) — прибирання зупинено, нічого з них не видалено`);
    }
  }
  // 3) Користувачі (profiles — on delete cascade з auth.users).
  for (const u of targets) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw error;
    deleted.push(u.email);
  }
  const remaining = (await listUatUsers(supabase))
    .filter((u) => !onlyEmail || u.email === onlyEmail)
    .map((u) => u.email);
  let leftoverRequests = 0;
  for (const { table, column } of targets.length ? OWNED_ROWS : []) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(
        column,
        targets.map((u) => u.id),
      );
    if (error) throw error;
    leftoverRequests += count ?? 0;
  }
  // Журнал прибирань прогону: afterAll специфікацій і teardown (Playwright чистить test-results/ на старті прогону).
  mkdirSync("test-results", { recursive: true });
  appendFileSync(
    CLEANUP_LOG,
    `${JSON.stringify({ at: new Date().toISOString(), scope: onlyEmail ?? "uat-*", deleted, remaining, leftoverRequests })}\n`,
  );
  return { deleted, remaining, leftoverRequests };
}
