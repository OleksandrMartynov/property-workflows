// UAT зрізу 3 (підрядник, requirements/39-assign-a-vendor-own-tasks.md): синтетичні учасники й запуски на проді.
// Дані готує проєкт setup (tests/e2e/auth.setup.ts, без відео й trace): акаунти uat-<run>-…@example.test з
// випадковими паролями, які ніде не зберігаються, і запуски-передумови «Дано». Прибирає teardown «cleanup»
// (tests/e2e/support/admin.ts, OWNED_ROWS: запуски й задачі синтетичних користувачів).
import { existsSync, readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** «Tenant move-in» — шаблон із початкових даних (міграція 20261019174350_run_launch.sql), той самий id на проді. */
export const TENANT_MOVE_IN = "10000000-0000-0000-0000-000000000001";
/** Менеджер B і адміністратор з AC-VENDOR-02 — акаунти supabase/demo-users.json на проді. */
export const MANAGER_B = "manager.b@example.test";
export const ADMINISTRATOR = "admin@example.test";

/** Хто є хто в AC зрізу 3. Ключ — суфікс адреси uat-<run>-<ключ>@example.test і файлу playwright/.auth/uat-<ключ>.json. */
export const PEOPLE = {
  // Менеджер A: запускає шаблон (AC-VENDOR-01, 02) і є менеджером запусків-передумов.
  manager: { role: "manager" },
  // Підрядник V для AC-VENDOR-01 і 02: його призначає A у формі запуску.
  vendorLaunch: { role: "vendor" },
  // Підрядник V для AC-VENDOR-03, 04, 06, 07, 08, 09: задачі 3 і 4 в «Apartment 12, move-in», жодної в «Apartment 14, repair».
  vendor: { role: "vendor" },
  // Підрядник V для AC-VENDOR-05: окремий запуск, бо позначка задачі 3 змінює «Your tasks» (AC-VENDOR-03 чекає 0 of 2).
  vendorDone: { role: "vendor" },
  // Підрядник V без жодної задачі (AC-VENDOR-10).
  vendorEmpty: { role: "vendor" },
} as const;
export type Person = keyof typeof PEOPLE;

export const statePath = (person: Person) => `playwright/.auth/uat-${person}.json`;
const FIXTURE = "playwright/.auth/uat-vendor-fixture.json";

export interface TemplateTask {
  template_task_id: string;
  name: string;
  section_name: string;
  required: boolean;
}

export interface VendorFixture {
  emails: Record<Person, string>;
  ids: Record<Person, string>;
  /** Задачі поточної версії «Tenant move-in» у порядку шаблону: task[0] — задача 1, task[2] — задача 3. */
  tasks: TemplateTask[];
  runs: { apartment12: string; apartment14: string };
}

export const writeFixturePath = FIXTURE;
export function readFixture(): VendorFixture {
  // Файл пише setup лише із секретним ключем (.env.local; у CI — ключ локального стеку, e2e.yml). Без нього AC зрізу 3
  // не перевірити — краще чесно впасти з поясненням, ніж мовчки пропустити.
  // Ключ перевіряємо щоразу: старий fixture попереднього прогону вказує на дані, які teardown уже видалив.
  if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !existsSync(FIXTURE)) {
    throw new Error(`Немає ${FIXTURE}: UAT зрізу 3 потребує SUPABASE_SECRET_KEY у .env.local (setup створює синтетичних учасників)`);
  }
  return JSON.parse(readFileSync(FIXTURE, "utf8")) as VendorFixture;
}

function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Потрібні NEXT_PUBLIC_SUPABASE_URL і NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local)");
  return { url, key };
}

/**
 * Клієнт Supabase від імені користувача, який увійшов у браузері, — з його сесії в storageState (cookie
 * sb-<ref>-auth-token, @supabase/ssr: «base64-…», можливо частинами .0, .1). Пароль для цього не потрібен.
 * Так UAT робить «прямий запит, оминаючи сторінки» тим самим ключем, що є в браузері користувача.
 */
export function clientFromState(person: Person): SupabaseClient {
  const state = JSON.parse(readFileSync(statePath(person), "utf8")) as { cookies: { name: string; value: string }[] };
  const chunk = (name: string) => Number(name.match(/\.(\d+)$/)?.[1] ?? -1);
  const parts = state.cookies.filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => chunk(a.name) - chunk(b.name));
  if (!parts.length) throw new Error(`У ${statePath(person)} немає cookie сесії Supabase`);
  let raw = decodeURIComponent(parts.map((c) => c.value).join(""));
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice("base64-".length), "base64url").toString("utf8");
  const { access_token: token } = JSON.parse(raw) as { access_token: string };
  const { url, key } = publicEnv();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Клієнт, що входить паролем — лише в setup (без запису), щоб підготувати запуски-передумови «Дано». */
export async function clientWithPassword(email: string, password: string): Promise<SupabaseClient> {
  const { url, key } = publicEnv();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Вхід ${email} не вдався: ${error.message}`);
  return client;
}

/** Задачі поточної версії «Tenant move-in» так, як їх бачить менеджер (його RLS), у порядку шаблону. */
export async function currentTemplateTasks(client: SupabaseClient): Promise<TemplateTask[]> {
  const { data: template, error: e1 } = await client.from("templates").select("current_version").eq("id", TENANT_MOVE_IN).single();
  if (e1) throw e1;
  const { data: version, error: e2 } = await client
    .from("template_versions")
    .select("id")
    .eq("template_id", TENANT_MOVE_IN)
    .eq("number", template.current_version)
    .single();
  if (e2) throw e2;
  const { data: tasks, error: e3 } = await client
    .from("template_version_tasks")
    .select("template_task_id, name, section_name, required")
    .eq("version_id", version.id)
    .order("section_position")
    .order("position");
  if (e3) throw e3;
  return tasks as TemplateTask[];
}

/** Запуск «Tenant move-in» від імені менеджера; assignees — задача (template_task_id) → виконавець. */
export async function launchTenantMoveIn(client: SupabaseClient, caseName: string, assignees: Record<string, string>): Promise<string> {
  const { data, error } = await client.rpc("launch_run", { p_template_id: TENANT_MOVE_IN, p_case_name: caseName, p_assignees: assignees });
  if (error) throw new Error(`Запуск «${caseName}» не вдався: ${error.message}`);
  return data as string;
}

/**
 * Перед кадром «Тоді» — дочекатися, поки скінчаться анімації появи (сторінка 240 мс, каскад рядків): інакше кадр
 * знято посеред переходу, вміст напівпрозорий, і рецензент чесно не може сказати, що це кінцевий стан. Нескінченні
 * анімації (спінер, пульс) не чекаємо.
 */
export async function settled(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity),
  );
}
