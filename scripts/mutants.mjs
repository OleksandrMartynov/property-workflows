// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — https://github.com/koldovsky/2026-quitcode-08-quality-hw/blob/main/materials/testing/scripts/mutants.mjs.
// Поля: id, kind ("sql" | "ts"), ac, what; file — що мутуємо; tests — тести, які мають довести правило; find — рядок,
// що трапляється у файлі РІВНО один раз; replace — заміна; expect: "survive" + reason — лише для еквівалентного мутанта.
const PROFILES = "supabase/migrations/20261012000000_profiles_and_roles.sql";
const PROFILES_DB = "tests/db/profiles-role-db.test.ts";
const VERSIONS = "supabase/migrations/20261025151836_template_versions.sql";
const VERSIONS_DB = "tests/db/template-versions-db.test.ts";
const VENDOR = "supabase/migrations/20261030125515_vendor_role.sql";
const VENDOR_DB = "tests/db/vendor-db.test.ts";
const LAUNCH = "supabase/migrations/20261102105500_launch_run_hide_draft.sql";
const VIEWER = "src/lib/supabase/viewer.ts";
const VENDOR_PAGES = "tests/vendor/vendor-pages.test.tsx";
const DOCS = "supabase/migrations/20261116162440_run_documents.sql";
const DOCS_DB = "tests/db/run-documents-db.test.ts";

export const mutants = [
  // ── Зріз 4 «Parse a document» (solomchaak/property-workflows-spec#59, AC-DOCAI-01…16) ───────────────────────────
  {
    id: "D1", kind: "sql", ac: "AC-DOCAI-16", file: DOCS, tests: [DOCS_DB],
    what: "check_run_document без перевірки менеджера запуску: менеджер-виконавець B зберігає значення в чужому запуску",
    find: "  if v_role <> 'admin' and (v_run.id is null or v_run.run_manager_id is distinct from v_uid) then",
    replace: "  if false then",
  },
  {
    id: "D2", kind: "sql", ac: "AC-DOCAI-15", file: DOCS, tests: [DOCS_DB],
    what: "run_documents_select без менеджера запуску: менеджер-виконавець B читає записи чужого запуску",
    find: "      where r.id = run_id and r.run_manager_id = (select auth.uid())",
    replace: "      where r.id = run_id",
  },
  {
    id: "D3", kind: "sql", ac: "AC-DOCAI-16", file: DOCS, tests: [DOCS_DB],
    what: "check_run_document без ролі: неіснуючий запуск для менеджера — RUN_NOT_FOUND (підказка, які запуски є)",
    find: "  if v_role = 'admin' and v_run.id is null then",
    replace: "  if v_run.id is null then",
  },
  {
    id: "D4", kind: "sql", ac: "(зріз 4: форма позицій)", file: DOCS, tests: [DOCS_DB],
    what: "перевірка типу поля позиції через <> замість IS DISTINCT FROM: позиція без name ({}) проходить",
    find: "                   when jsonb_typeof(e.item -> 'name') is distinct from 'string' then true",
    replace: "                   when jsonb_typeof(e.item -> 'name') <> 'string' then true",
  },
  {
    id: "D5", kind: "sql", ac: "(зріз 4: межа позицій)", file: DOCS, tests: [DOCS_DB],
    what: "save_run_document без межі 30 позицій кошторису",
    find: "         when jsonb_array_length(p_items) > 30 then true\n",
    replace: "",
  },
  // ── Перевірка гарнесу (PGlite) на profiles шаблону ─────────────────────────────────────────────────────────────
  {
    id: "P1", kind: "sql", ac: "(перевірка гарнесу)", file: PROFILES, tests: [PROFILES_DB],
    what: "колонковий grant: користувач може змінити собі role (самопідвищення)",
    find: "grant update (full_name) on table public.profiles to authenticated;",
    replace: "grant update (full_name, role) on table public.profiles to authenticated;",
  },
  // ── AC-EDITOR-29: прямим запитом менеджер отримує лише поточну версію ──────────────────────────────────────────────
  // Дані закриває політика template_versions_select. (AC-EDITOR-07 — сторінка: її відмову тримає canManageTemplates у TS
  // і доводять Stryker та рендер сторінки без жодного запиту версій, tests/templates/forbidden.test.tsx.)
  {
    id: "E29a", kind: "sql", ac: "AC-EDITOR-29", file: VERSIONS, tests: [VERSIONS_DB],
    what: "template_versions_select: менеджер бачить усі версії шаблону, а не лише поточну",
    find: "        (select private.current_app_role()) = 'manager'\n        and exists (\n          select 1 from public.templates as t\n          where t.id = template_versions.template_id and t.current_version = template_versions.number\n        )",
    replace: "        (select private.current_app_role()) = 'manager'",
  },
  {
    id: "E29b", kind: "sql", ac: "AC-EDITOR-29", file: VERSIONS, tests: [VERSIONS_DB],
    what: "template_versions_select послаблено до true: будь-хто з входом бачить усі версії",
    find: "create policy template_versions_select on public.template_versions\n  for select to authenticated\n  using (\n    (select auth.uid()) is not null\n    and (\n      (select private.current_app_role()) = 'admin'",
    replace: "create policy template_versions_select on public.template_versions\n  for select to authenticated\n  using (\n    true or (\n      (select private.current_app_role()) = 'admin'",
  },
  // ── Зріз 3, підрядник (requirements/39-assign-a-vendor-own-tasks.md): кожне правило відмови — окремий мутант ────────
  {
    id: "V03", kind: "sql", ac: "AC-VENDOR-03", file: VENDOR, tests: [VENDOR_DB],
    what: "vendor_runs: підрядник отримує всі запуски, а не лише ті, де він виконавець, і лічильник усіх задач",
    find: "join public.run_tasks as t on t.run_id = r.id and t.assignee_id = (select auth.uid())",
    replace: "join public.run_tasks as t on t.run_id = r.id",
  },
  {
    id: "V04", kind: "sql", ac: "AC-VENDOR-04", file: VENDOR, tests: [VENDOR_DB],
    what: "run_tasks_select_visible: підрядник читає всі задачі запуску, а не лише свої",
    find: "and ((select private.current_app_role()) is distinct from 'vendor' or assignee_id = (select auth.uid()))",
    replace: "and (true or assignee_id = (select auth.uid()))",
  },
  {
    id: "V06", kind: "sql", ac: "AC-VENDOR-06", file: VENDOR, tests: [VENDOR_DB],
    what: "runs_select_visible: рядок запуску (з шаблоном і версією) підряднику відкрито напряму",
    find: "    and (select private.current_app_role()) is distinct from 'vendor'\n  );",
    replace: "    and true\n  );",
  },
  {
    id: "V07", kind: "sql", ac: "AC-VENDOR-07", file: VENDOR, tests: [VENDOR_DB],
    what: "complete_task: підрядник позначає задачу, де він не виконавець (лишається лише перевірка менеджера запуску)",
    find: "  if v_role = 'vendor' and v_task.assignee_id is distinct from v_uid then",
    replace: "  if false and v_task.assignee_id is distinct from v_uid then",
  },
  {
    id: "V08", kind: "sql", ac: "AC-VENDOR-08", file: VERSIONS, tests: [VENDOR_DB],
    what: "templates_select_by_role: підрядник читає опубліковані шаблони, як менеджер",
    find: "or ((select private.current_app_role()) = 'manager' and current_version is not null)",
    replace: "or ((select private.current_app_role()) in ('manager', 'vendor') and current_version is not null)",
  },
  {
    id: "V08t", kind: "ts", ac: "AC-VENDOR-08", file: VIEWER, tests: [VENDOR_PAGES],
    what: "isVendor завжди false: сторінка шаблонів показує підряднику список, а не «Not enough rights»",
    find: 'export const isVendor = (role: AppRole) => role === "vendor";',
    replace: "export const isVendor = (role: AppRole) => role !== role;",
  },
  {
    id: "V09", kind: "sql", ac: "AC-VENDOR-09", file: LAUNCH, tests: [VENDOR_DB],
    what: "launch_run (остання версія): підрядник запускає шаблон",
    find: "v_role not in ('manager', 'admin') then",
    replace: "v_role not in ('manager', 'admin', 'vendor') then",
  },
];
