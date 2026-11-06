#!/usr/bin/env node
// npm run template:ac — приводить шаблон «Tenant move-in» до форми, яку описують AC PM, і зберігає нову версію:
//   «Before move-in» — 2 задачі (AC-RUN-12, AC-TASK-12, AC-EDITOR-28), «Move-in day» — 3 задачі (AC-EDITOR-13, 14);
//   5 задач, 3 обов'язкові (AC-RUN-01, AC-TASK-15). Сид зрізу 1 мав 3 і 2 (відгуки WS6–WS8), а прод міг змінитись
//   у редакторі. PM і UAT приймають зрізи на цих даних, тож «Дано» з AC має збігатися з тим, що на екрані.
//
// Як адміністратор, через ті самі функції редактора, що й сторінка (RLS і перевірки бази діють як завжди): секретний
// ключ не потрібен. Ідемпотентно: якщо чернетка вже має потрібну форму й незбережених змін немає — нічого не робить.
// Застосовані міграції й збережені версії не змінюються: з'являється лише нова версія.
//
// Змінні (.env.local; у CI їх пише .github/workflows/e2e.yml): NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DEMO_USER_PASSWORD; ADMIN_EMAIL — за замовчуванням admin@example.test.
// Значень ключів і паролів скрипт не друкує.
import { createClient } from "@supabase/supabase-js";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const TARGET = [
  { name: "Before move-in", tasks: [["Sign the lease agreement", true], ["Inspect the apartment", true]] },
  { name: "Move-in day", tasks: [["Hand over the keys", true], ["Record meter readings", false], ["Order cleaning", false]] },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.DEMO_USER_PASSWORD;
const email = process.env.ADMIN_EMAIL ?? "admin@example.test";
const missing = Object.entries({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, DEMO_USER_PASSWORD: password })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Не задано: ${missing.join(", ")}. Додайте їх у .env.local (див. .env.example).`);
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error(`Вхід ${email} не вдався: ${signInError.message}`);
  process.exit(1);
}

let changed = 0;
async function rpc(fn, args) {
  const { error } = await sb.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  changed++;
}

/** Чернетка шаблону: секції в порядку позицій, у кожній — задачі в порядку позицій. */
async function load() {
  const { data: sections, error } = await sb
    .from("template_sections")
    .select("id, name, position")
    .eq("template_id", TEMPLATE)
    .order("position");
  if (error) throw new Error(`template_sections: ${error.message}`);
  const ids = sections.map((s) => s.id);
  const { data: tasks, error: tasksError } = ids.length
    ? await sb.from("template_tasks").select("id, section_id, name, required, position").in("section_id", ids).order("position")
    : { data: [], error: null };
  if (tasksError) throw new Error(`template_tasks: ${tasksError.message}`);
  return sections.map((s) => ({ ...s, tasks: tasks.filter((t) => t.section_id === s.id) }));
}
const byName = (list, name) => list.find((x) => x.name === name);

/** Переставляє елементи «up», доки їхній порядок не збігся з цільовим. */
async function order(kind, current, wanted) {
  for (let i = 0; i < wanted.length; i++) {
    let at = current.findIndex((x) => x.name === wanted[i]);
    while (at > i) {
      await rpc("move_template_item", { p_template_id: TEMPLATE, p_kind: kind, p_id: current[at].id, p_direction: "up" });
      [current[at - 1], current[at]] = [current[at], current[at - 1]];
      at--;
    }
  }
}

// 1. Цільові секції існують.
let draft = await load();
for (const section of TARGET) {
  if (!byName(draft, section.name)) await rpc("add_template_section", { p_template_id: TEMPLATE, p_name: section.name });
}

// 2. Кожна цільова задача — у своїй секції, з потрібною позначкою required.
draft = await load();
const allTasks = () => draft.flatMap((s) => s.tasks);
for (const section of TARGET) {
  const sectionId = byName(draft, section.name).id;
  for (const [name, required] of section.tasks) {
    const task = byName(allTasks(), name);
    if (!task) {
      await rpc("add_template_task", { p_template_id: TEMPLATE, p_section_id: sectionId, p_name: name, p_required: required });
      continue;
    }
    if (task.section_id !== sectionId) {
      await rpc("move_template_task_to_section", { p_template_id: TEMPLATE, p_task_id: task.id, p_section_id: sectionId });
    }
    if (task.required !== required) {
      await rpc("update_template_task", { p_template_id: TEMPLATE, p_task_id: task.id, p_name: name, p_required: required });
    }
  }
}

// 3. Зайві задачі й секції (додані в редакторі після сиду) — прибрати: AC описують рівно 2 секції й 5 задач.
draft = await load();
const wantedTasks = new Set(TARGET.flatMap((s) => s.tasks.map(([name]) => name)));
for (const task of allTasks()) {
  if (!wantedTasks.has(task.name)) await rpc("remove_template_task", { p_template_id: TEMPLATE, p_task_id: task.id });
}
const wantedSections = new Set(TARGET.map((s) => s.name));
for (const section of draft) {
  if (!wantedSections.has(section.name)) await rpc("remove_template_section", { p_template_id: TEMPLATE, p_section_id: section.id });
}

// 4. Порядок секцій і задач у кожній секції — як в AC.
draft = await load();
await order("section", [...draft], TARGET.map((s) => s.name));
draft = await load();
for (const section of TARGET) {
  await order("task", [...byName(draft, section.name).tasks], section.tasks.map(([name]) => name));
}

// 5. Зберегти версію, якщо є незбережені зміни.
const { data: drafts, error: draftsError } = await sb.rpc("list_template_drafts");
if (draftsError) throw new Error(`list_template_drafts: ${draftsError.message}`);
const template = drafts.find((t) => t.id === TEMPLATE);
if (!template) throw new Error("Шаблон «Tenant move-in» не знайдено");
if (template.has_unpublished_changes) await rpc("save_template_version", { p_template_id: TEMPLATE });

// Підсумок — з того, що тепер у базі.
draft = await load();
const { data: after } = await sb.rpc("list_template_drafts");
const version = after.find((t) => t.id === TEMPLATE)?.current_version;
const shape = draft.map((s) => `${s.name} (${s.tasks.length})`).join(", ");
const ok = JSON.stringify(draft.map((s) => [s.name, s.tasks.map((t) => [t.name, t.required])])) ===
  JSON.stringify(TARGET.map((s) => [s.name, s.tasks]));
console.log(`«Tenant move-in»: поточна версія ${version}; ${shape}; змін через редактор: ${changed}${ok ? " — форма як в AC" : " — ФОРМА НЕ ЗБІГАЄТЬСЯ З AC"}`);
await sb.auth.signOut();
if (!ok) process.exitCode = 1;
