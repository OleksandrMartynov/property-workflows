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

async function main() {
  // 0. Чужа незбережена робота — не чіпаємо (без --discard-draft нічого не пишемо).
  const before = await templateRow();
  if (before.has_unpublished_changes && !DISCARD_DRAFT) {
    throw new Error(
      "у шаблоні є незбережені зміни (хтось редагує чернетку). Збережіть їх у редакторі або свідомо відкиньте: npm run template:ac -- --discard-draft",
    );
  }

  // 1. Цільові секції існують.
  let draft = await load();
  for (const section of TARGET) {
    if (!byName(draft, section.name)) await rpc("add_template_section", { p_template_id: TEMPLATE, p_name: section.name });
  }

  // 2. Кожна цільова задача — у своїй секції, з потрібною позначкою required. Якщо задач з такою назвою кілька
  //    (наприклад, «Order cleaning» із сиду й додана в редакторі), цільовою стає перша в цільовій секції.
  draft = await load();
  const allTasks = () => draft.flatMap((s) => s.tasks);
  const kept = new Set();
  for (const section of TARGET) {
    const sectionId = byName(draft, section.name).id;
    for (const [name, required] of section.tasks) {
      const same = allTasks().filter((t) => t.name === name);
      const task = same.find((t) => t.section_id === sectionId) ?? same[0];
      if (!task) {
        await rpc("add_template_task", { p_template_id: TEMPLATE, p_section_id: sectionId, p_name: name, p_required: required });
        continue;
      }
      kept.add(task.id);
      if (task.section_id !== sectionId) {
        await rpc("move_template_task_to_section", { p_template_id: TEMPLATE, p_task_id: task.id, p_section_id: sectionId });
      }
      if (task.required !== required) {
        await rpc("update_template_task", { p_template_id: TEMPLATE, p_task_id: task.id, p_name: name, p_required: required });
      }
    }
  }

  // 3. Зайві задачі (поза AC і дублікати цільових) і секції — прибрати: AC описують рівно 2 секції й 5 задач. Задачі
  //    з попередніх версій лишаються в історії версій.
  draft = await load();
  const wantedTasks = new Set(TARGET.flatMap((s) => s.tasks.map(([name]) => name)));
  for (const task of allTasks()) {
    const extra = !wantedTasks.has(task.name) || (!kept.has(task.id) && allTasks().some((t) => t.name === task.name && kept.has(t.id)));
    if (extra) await rpc("remove_template_task", { p_template_id: TEMPLATE, p_task_id: task.id });
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

  // 5. Форма — до збереження: не як в AC — версію не зберігаємо. Назву шаблону скрипт не змінює й не публікує чужу:
  //    незбережених змін на старті не було (крок 0), тож нова версія містить лише зміни цього прогону.
  draft = await load();
  const shape = draft.map((s) => `${s.name} (${s.tasks.length})`).join(", ");
  if (shapeOf(draft) !== TARGET_SHAPE) throw new Error(`форма чернетки не збігається з AC: ${shape}; версію не збережено`);
  if ((await templateRow()).has_unpublished_changes) await rpc("save_template_version", { p_template_id: TEMPLATE });

  const after = await templateRow();
  console.log(`«Tenant move-in»: поточна версія ${after.current_version}; ${shape}; змін через редактор: ${changed} — форма як в AC`);
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
