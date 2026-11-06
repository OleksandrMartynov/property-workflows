#!/usr/bin/env node
// npm run template:ac — приводить шаблон «Tenant move-in» до форми, яку описують AC PM, і зберігає нову версію:
//   «Before move-in» — 2 задачі (AC-RUN-12, AC-TASK-12, AC-EDITOR-28), «Move-in day» — 3 задачі (AC-EDITOR-13, 14);
//   5 задач, 3 обов'язкові (AC-RUN-01, AC-TASK-15). Сид зрізу 1 мав 3 і 2 (відгуки WS6–WS8), а прод міг змінитись
//   у редакторі. PM і UAT приймають зрізи на цих даних, тож «Дано» з AC має збігатися з тим, що на екрані.
//
// Як адміністратор, через ті самі функції редактора, що й сторінка (RLS і перевірки бази діють як завжди): секретний
// ключ не потрібен. Ідемпотентно: якщо чернетка вже має потрібну форму й незбережених змін немає — нічого не робить.
// Застосовані міграції й збережені версії не змінюються: з'являється лише нова версія; задачі, яких немає в AC, лишаються
// в попередніх версіях (сторінка «Versions»).
//
// Захист чужої роботи: якщо на старті в шаблоні вже є незбережені зміни (адміністратор редагує чернетку), скрипт
// нічого не пише й зупиняється — інакше видалив би незбережені задачі чи опублікував чужу назву. Свідомо відкинути
// чернетку — `npm run template:ac -- --discard-draft`. Форма перевіряється до збереження версії: якщо не збігається з
// AC — версію не збережено. `--expect-no-changes` — повторний прогін має нічого не змінити (перевірка ідемпотентності).
//
// Змінні (.env.local, якщо є; у CI їх пише .github/workflows/e2e.yml): NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DEMO_USER_PASSWORD; ADMIN_EMAIL — за замовчуванням admin@example.test.
// Значень ключів і паролів скрипт не друкує.
import { createClient } from "@supabase/supabase-js";

const TEMPLATE = "10000000-0000-0000-0000-000000000001";
const TARGET = [
  { name: "Before move-in", tasks: [["Sign the lease agreement", true], ["Inspect the apartment", true]] },
  { name: "Move-in day", tasks: [["Hand over the keys", true], ["Record meter readings", false], ["Order cleaning", false]] },
];
const DISCARD_DRAFT = process.argv.includes("--discard-draft");
const EXPECT_NO_CHANGES = process.argv.includes("--expect-no-changes");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.DEMO_USER_PASSWORD;
const email = process.env.ADMIN_EMAIL ?? "admin@example.test";
const missing = Object.entries({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, DEMO_USER_PASSWORD: password })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Не задано: ${missing.join(", ")}. Додайте їх у .env.local (див. .env.example) або в змінні середовища.`);
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

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

/** Рядок шаблону зі списку чернеток (назва, поточна версія, чи є незбережені зміни). */
async function templateRow() {
  const { data, error } = await sb.rpc("list_template_drafts");
  if (error) throw new Error(`list_template_drafts: ${error.message}`);
  const row = (data ?? []).find((t) => t.id === TEMPLATE);
  if (!row) throw new Error("шаблон «Tenant move-in» не знайдено");
  return row;
}

const byName = (list, name) => list.find((x) => x.name === name);
const shapeOf = (draft) => JSON.stringify(draft.map((s) => [s.name, s.tasks.map((t) => [t.name, t.required])]));
const TARGET_SHAPE = JSON.stringify(TARGET.map((s) => [s.name, s.tasks]));

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

// 0. Чужа незбережена робота — не чіпаємо (без --discard-draft нічого не пишемо).
async function guardDraft() {
  const { has_unpublished_changes: dirty } = await templateRow();
  if (dirty && !DISCARD_DRAFT) {
    throw new Error(
      "у шаблоні є незбережені зміни (хтось редагує чернетку). Збережіть їх у редакторі або свідомо відкиньте: npm run template:ac -- --discard-draft",
    );
  }
}

// 1. Цільові секції існують.
async function ensureSections() {
  const draft = await load();
  for (const section of TARGET.filter((t) => !byName(draft, t.name))) {
    await rpc("add_template_section", { p_template_id: TEMPLATE, p_name: section.name });
  }
}

/** Задача з цією назвою: спершу в цільовій секції, інакше будь-яка (дублікати прибере крок 3). */
const findTask = (tasks, sectionId, name) =>
  tasks.find((t) => t.name === name && t.section_id === sectionId) ?? tasks.find((t) => t.name === name);

/** Одна цільова задача: додати, якщо немає; інакше перенести в секцію й виставити required. Повертає id наявної. */
async function placeTask(tasks, sectionId, name, required) {
  const task = findTask(tasks, sectionId, name);
  if (!task) {
    await rpc("add_template_task", { p_template_id: TEMPLATE, p_section_id: sectionId, p_name: name, p_required: required });
    return null;
  }
  if (task.section_id !== sectionId) await rpc("move_template_task_to_section", { p_template_id: TEMPLATE, p_task_id: task.id, p_section_id: sectionId });
  if (task.required !== required) await rpc("update_template_task", { p_template_id: TEMPLATE, p_task_id: task.id, p_name: name, p_required: required });
  return task.id;
}

// 2. Кожна цільова задача — у своїй секції, з потрібною позначкою required. Якщо задач з такою назвою кілька
//    (наприклад, «Order cleaning» із сиду й додана в редакторі), цільовою стає перша в цільовій секції.
async function placeTasks() {
  const draft = await load();
  const tasks = draft.flatMap((s) => s.tasks);
  const kept = new Set();
  for (const section of TARGET) {
    const sectionId = byName(draft, section.name).id;
    for (const [name, required] of section.tasks) kept.add(await placeTask(tasks, sectionId, name, required));
  }
  return kept;
}

// 3. Зайві задачі (поза AC і дублікати цільових) і секції — прибрати: AC описують рівно 2 секції й 5 задач. Задачі
//    з попередніх версій лишаються в історії версій.
async function removeExtras(kept) {
  const draft = await load();
  const tasks = draft.flatMap((s) => s.tasks);
  const keptNames = new Set(tasks.filter((t) => kept.has(t.id)).map((t) => t.name));
  const wantedTasks = new Set(TARGET.flatMap((s) => s.tasks.map(([name]) => name)));
  // Зайва — поза AC або дублікат назви, для якої вже є цільова задача.
  const extra = tasks.filter((t) => !wantedTasks.has(t.name) || (!kept.has(t.id) && keptNames.has(t.name)));
  for (const task of extra) await rpc("remove_template_task", { p_template_id: TEMPLATE, p_task_id: task.id });
  const wantedSections = new Set(TARGET.map((s) => s.name));
  for (const section of draft.filter((x) => !wantedSections.has(x.name))) {
    await rpc("remove_template_section", { p_template_id: TEMPLATE, p_section_id: section.id });
  }
}

// 4. Порядок секцій і задач у кожній секції — як в AC.
async function reorder() {
  await order("section", [...(await load())], TARGET.map((s) => s.name));
  const draft = await load();
  for (const section of TARGET) {
    await order("task", [...byName(draft, section.name).tasks], section.tasks.map(([name]) => name));
  }
}

// 5. Форма — до збереження: не як в AC — версію не зберігаємо. Назву шаблону скрипт не змінює й не публікує чужу:
//    незбережених змін на старті не було (крок 0), тож нова версія містить лише зміни цього прогону.
async function saveIfShaped() {
  const draft = await load();
  const shape = draft.map((s) => `${s.name} (${s.tasks.length})`).join(", ");
  if (shapeOf(draft) !== TARGET_SHAPE) throw new Error(`форма чернетки не збігається з AC: ${shape}; версію не збережено`);
  if ((await templateRow()).has_unpublished_changes) await rpc("save_template_version", { p_template_id: TEMPLATE });
  return shape;
}

async function main() {
  await guardDraft();
  await ensureSections();
  await removeExtras(await placeTasks());
  await reorder();
  const shape = await saveIfShaped();
  const { current_version: version } = await templateRow();
  console.log(`«Tenant move-in»: поточна версія ${version}; ${shape}; змін через редактор: ${changed} — форма як в AC`);
  if (EXPECT_NO_CHANGES && changed > 0) throw new Error(`повторний прогін мав нічого не змінити, а змінив ${changed}`);
}

try {
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`вхід ${email} не вдався: ${signInError.message}`);
  await main();
} catch (error) {
  console.error(`template:ac — помилка: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await sb.auth.signOut();
}
