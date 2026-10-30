// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — https://github.com/koldovsky/2026-quitcode-08-quality-hw/blob/main/materials/testing/scripts/mutants.mjs.
// Поля: id, kind ("sql" | "ts"), ac, what; file — що мутуємо; tests — тести, які мають довести правило; find — рядок,
// що трапляється у файлі РІВНО один раз; replace — заміна; expect: "survive" + reason — лише для еквівалентного мутанта.
const PROFILES = "supabase/migrations/20261012000000_profiles_and_roles.sql";
const PROFILES_DB = "tests/db/profiles-role-db.test.ts";
const VERSIONS = "supabase/migrations/20261025151836_template_versions.sql";
const VERSIONS_DB = "tests/db/template-versions-db.test.ts";

export const mutants = [
  // ── Перевірка гарнесу (PGlite) на profiles шаблону ─────────────────────────────────────────────────────────────
  {
    id: "P1", kind: "sql", ac: "(перевірка гарнесу)", file: PROFILES, tests: [PROFILES_DB],
    what: "колонковий grant: користувач може змінити собі role (самопідвищення)",
    find: "grant update (full_name) on table public.profiles to authenticated;",
    replace: "grant update (full_name, role) on table public.profiles to authenticated;",
  },
  // ── AC-EDITOR-07: менеджер за прямим посиланням на список версій — «Not enough rights» і жодної версії ─────────
  // Сторінку закриває canManageTemplates (TS, Stryker), а дані — політика template_versions_select: менеджер не
  // отримує жодної версії, крім поточної, навіть прямим запитом.
  {
    id: "E7a", kind: "sql", ac: "AC-EDITOR-07", file: VERSIONS, tests: [VERSIONS_DB],
    what: "template_versions_select: менеджер бачить усі версії шаблону, а не лише поточну",
    find: "        (select private.current_app_role()) = 'manager'\n        and exists (\n          select 1 from public.templates as t\n          where t.id = template_versions.template_id and t.current_version = template_versions.number\n        )",
    replace: "        (select private.current_app_role()) = 'manager'",
  },
  {
    id: "E7b", kind: "sql", ac: "AC-EDITOR-07", file: VERSIONS, tests: [VERSIONS_DB],
    what: "template_versions_select послаблено до true: будь-хто з входом бачить усі версії",
    find: "create policy template_versions_select on public.template_versions\n  for select to authenticated\n  using (\n    (select auth.uid()) is not null\n    and (\n      (select private.current_app_role()) = 'admin'",
    replace: "create policy template_versions_select on public.template_versions\n  for select to authenticated\n  using (\n    true or (\n      (select private.current_app_role()) = 'admin'",
  },
];
