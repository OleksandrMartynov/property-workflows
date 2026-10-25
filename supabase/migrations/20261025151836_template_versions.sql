-- Зріз 2, задача 1 (openspec/changes/impl-template-editor, design.md «Дані й RLS»; ADR 0006): незбережені зміни
-- шаблону й незмінні пронумеровані версії.
-- AC: AC-EDITOR-01, AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-06, AC-EDITOR-08.
--
-- Робочі таблиці template_sections і template_tasks тепер — незбережені зміни (Unpublished changes): їх бачить і змінює
-- лише admin. Версія — знімок у template_versions + template_version_tasks, який ніхто не змінює й не видаляє.
-- launch_run копіює задачі з поточної версії. Застосованих міграцій не змінюємо: alter / create or replace.

-- ── Шаблон: поточна версія і позначка незбережених змін ───────────────────────
alter table public.templates
  add column current_version integer constraint templates_current_version_check check (current_version > 0),
  add column has_unpublished_changes boolean not null default true;

comment on column public.templates.current_version is
  'Номер поточної версії (Current version); null — шаблон ще ніколи не збережено як версію.';
comment on column public.templates.has_unpublished_changes is
  'Є незбережені зміни (Unpublished changes): ставлять тригери робочих таблиць, знімає лише save_template_version.';

-- Column grants: адміністратор створює шаблон і змінює лише назву; номер версії й позначку змінює тільки функція
-- збереження й тригери (security definer). Пастка «update всього рядка» закрита (AC-EDITOR-08).
revoke insert, update on table public.templates from authenticated;
grant insert (name) on table public.templates to authenticated;
grant update (name) on table public.templates to authenticated;

-- ── Версії: незмінний знімок ───────────────────────────────────────────────────
create table public.template_versions (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  number      integer not null constraint template_versions_number_check check (number > 0),
  name        text not null,
  saved_at    timestamptz not null default now(),
  -- null — версія з початкових даних зрізу 1, яку ніхто не зберігав у редакторі («Initial data»).
  saved_by    uuid references public.profiles (id) on delete set null,
  constraint template_versions_template_number_key unique (template_id, number)
);

create table public.template_version_tasks (
  id               uuid primary key default gen_random_uuid(),
  version_id       uuid not null references public.template_versions (id) on delete cascade,
  -- Задача робочих таблиць, з якої знято знімок: ключ призначення виконавця у формі запуску.
  template_task_id uuid not null,
  section_name     text not null,
  section_position integer not null,
  position         integer not null,
  name             text not null,
  required         boolean not null
);
create index template_version_tasks_version_id_idx on public.template_version_tasks (version_id);

comment on table public.template_versions is
  'Версія шаблону (Version): номер 1, 2, 3… у порядку збереження; створює лише save_template_version, ніхто не змінює.';
comment on table public.template_version_tasks is 'Секції й задачі версії шаблону — знімок на момент збереження.';

alter table public.template_versions enable row level security;
alter table public.template_version_tasks enable row level security;

revoke all on table public.template_versions, public.template_version_tasks from anon, authenticated;
-- Клієнт лише читає. Insert — функція збереження; update і delete не дає ніхто: збережена версія ніколи не змінюється.
grant select on table public.template_versions, public.template_version_tasks to authenticated;
grant select, insert, update, delete on table public.template_versions, public.template_version_tasks to service_role;

-- admin бачить усі версії (список версій, AC-EDITOR-05); manager — лише поточну версію шаблону (AC-EDITOR-02, AC-EDITOR-07).
create policy template_versions_select on public.template_versions
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      (select private.current_app_role()) = 'admin'
      or (
        (select private.current_app_role()) = 'manager'
        and exists (
          select 1 from public.templates as t
          where t.id = template_versions.template_id and t.current_version = template_versions.number
        )
      )
    )
  );

-- Задачі версії видно тоді, коли видно саму версію (RLS template_versions у підзапиті).
create policy template_version_tasks_select on public.template_version_tasks
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and exists (select 1 from public.template_versions as v where v.id = template_version_tasks.version_id)
  );

-- ── Незбережені зміни бачить лише admin (AC-EDITOR-02) ───────────────────────────
alter policy templates_select_app_users on public.templates
  using (
    (select auth.uid()) is not null
    and (
      (select private.current_app_role()) = 'admin'
      or ((select private.current_app_role()) = 'manager' and current_version is not null)
    )
  );
alter policy template_sections_select_app_users on public.template_sections
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy template_tasks_select_app_users on public.template_tasks
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy templates_select_app_users on public.templates rename to templates_select_by_role;
alter policy template_sections_select_app_users on public.template_sections rename to template_sections_select_admin;
alter policy template_tasks_select_app_users on public.template_tasks rename to template_tasks_select_admin;

-- ── Позначка «Unpublished changes» (AC-EDITOR-01) ─────────────────────────────────
-- security definer: адміністратор не має grant update на has_unpublished_changes (column grant вище).
create or replace function private.mark_template_unpublished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template_id uuid;
begin
  if tg_table_name = 'template_sections' then
    v_template_id := coalesce(new.template_id, old.template_id);
  else
    select s.template_id into v_template_id
    from public.template_sections as s
    where s.id = coalesce(new.section_id, old.section_id);
  end if;
  update public.templates set has_unpublished_changes = true
  where id = v_template_id and not has_unpublished_changes;
  return null;
end;
$$;
revoke execute on function private.mark_template_unpublished() from public, anon, authenticated;

create trigger template_sections_mark_unpublished
  after insert or update or delete on public.template_sections
  for each row execute function private.mark_template_unpublished();
create trigger template_tasks_mark_unpublished
  after insert or update or delete on public.template_tasks
  for each row execute function private.mark_template_unpublished();

-- Назва шаблону — частина версії (робоче припущення QC): перейменування теж незбережена зміна.
create or replace function private.mark_template_renamed()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    new.has_unpublished_changes := true;
  end if;
  return new;
end;
$$;
revoke execute on function private.mark_template_renamed() from public, anon, authenticated;

create trigger templates_mark_renamed
  before update of name on public.templates
  for each row execute function private.mark_template_renamed();

-- ── Перехід даних зрізу 1: наявні шаблони — версія 1 ──────────────────────────────
-- Шаблони з початкових даних зрізу 1 стають версією 1 без автора («Initial data»), наявні запуски — запусками з
-- версії 1 (робоче припущення, docs/spec-reading.md «Зріз 2»). Менеджери й далі запускають ті самі шаблони.
insert into public.template_versions (template_id, number, name, saved_at, saved_by)
select t.id, 1, t.name, now(), null from public.templates as t;

insert into public.template_version_tasks
  (version_id, template_task_id, section_name, section_position, position, name, required)
select v.id, tt.id, s.name, s.position, tt.position, tt.name, tt.required
from public.template_versions as v
join public.template_sections as s on s.template_id = v.template_id
join public.template_tasks as tt on tt.section_id = s.id;

update public.templates set current_version = 1, has_unpublished_changes = false;

-- ── Версія запуску (AC-EDITOR-06) ─────────────────────────────────────────────────
alter table public.runs
  add column template_version integer constraint runs_template_version_check check (template_version > 0);
comment on column public.runs.template_version is 'Номер версії шаблону, з якої запущено запуск («Template version N»).';
update public.runs set template_version = 1;

-- ── Збереження версії (AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-08) ───────────────────
create or replace function private.save_template_version(p_template_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_template  public.templates;
  v_number    integer;
  v_version   uuid;
begin
  -- Матриця прав «Create a template, edit it and save it as a new version»: лише admin (AC-EDITOR-08).
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;

  -- for update: два збереження одного шаблону йдуть по черзі, номер не повторюється; запуск чекає (for share).
  select * into v_template from public.templates as t where t.id = p_template_id for update;
  if v_template.id is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;

  -- Без незбережених змін нової версії не створюємо (робоче припущення, solomchaak/property-workflows-spec#22).
  if not v_template.has_unpublished_changes then
    raise exception 'NO_UNPUBLISHED_CHANGES';
  end if;

  -- AC-EDITOR-04: версії без обов'язкової задачі не буває; незбережені зміни лишаються (транзакцію відкочено).
  if not exists (
    select 1 from public.template_tasks as tt
    join public.template_sections as s on s.id = tt.section_id
    where s.template_id = p_template_id and tt.required
  ) then
    raise exception 'TEMPLATE_NEEDS_REQUIRED_TASK';
  end if;

  -- Секція без задач у версію не йде (робоче припущення QA, docs/spec-reading.md «Зріз 2»).
  if exists (
    select 1 from public.template_sections as s
    where s.template_id = p_template_id
      and not exists (select 1 from public.template_tasks as tt where tt.section_id = s.id)
  ) then
    raise exception 'SECTION_WITHOUT_TASKS';
  end if;

  -- AC-EDITOR-03: версія 1 для нового шаблону, наступний номер для наявного; номер ніколи не повторюється.
  select coalesce(max(v.number), 0) + 1 into v_number
  from public.template_versions as v where v.template_id = p_template_id;

  insert into public.template_versions (template_id, number, name, saved_by)
  values (p_template_id, v_number, v_template.name, v_uid)
  returning id into v_version;

  insert into public.template_version_tasks
    (version_id, template_task_id, section_name, section_position, position, name, required)
  select v_version, tt.id, s.name, s.position, tt.position, tt.name, tt.required
  from public.template_sections as s
  join public.template_tasks as tt on tt.section_id = s.id
  where s.template_id = p_template_id;

  update public.templates
  set current_version = v_number, has_unpublished_changes = false
  where id = p_template_id;

  return v_number;
end;
$$;

revoke execute on function private.save_template_version(uuid) from public, anon;
grant execute on function private.save_template_version(uuid) to authenticated;

-- Обгортка для Data API (supabase.rpc('save_template_version')).
create or replace function public.save_template_version(p_template_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.save_template_version(p_template_id);
$$;

revoke execute on function public.save_template_version(uuid) from public, anon;
grant execute on function public.save_template_version(uuid) to authenticated;

-- ── Запуск із поточної версії (AC-EDITOR-06; ADR 0006 замінює блокування з ADR 0003) ──
-- Версія незмінна, тож знімок задач стабільний сам; блокуємо лише рядок шаблону for share, щоб збереження нової версії
-- (for update) не змінило «поточну» посеред запуску. Запуски одного шаблону одне одного не блокують.
create or replace function private.launch_run(p_template_id uuid, p_case_name text, p_assignees jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := (select auth.uid());
  v_role         text;
  v_case_name    text;
  v_template     public.templates;
  v_version_id   uuid;
  v_version_name text;
  v_run_id       uuid;
  v_assignees    jsonb := coalesce(p_assignees, '{}'::jsonb);
  v_valid        jsonb := '{}'::jsonb;
  v_item         record;
begin
  select p.role into v_role from public.profiles as p where p.id = v_uid;
  -- Матриця прав «Launch a template»: manager і admin.
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin') then
    raise exception 'LAUNCH_NOT_ALLOWED';
  end if;

  -- AC-RUN-03, AC-RUN-07, AC-RUN-11: назва без пробілів на краях, 1–100 символів.
  v_case_name := regexp_replace(coalesce(p_case_name, ''), '^\s+|\s+$', '', 'g');
  if v_case_name = '' then
    raise exception 'CASE_NAME_REQUIRED';
  end if;
  if char_length(v_case_name) > 100 then
    raise exception 'CASE_NAME_TOO_LONG';
  end if;

  select * into v_template from public.templates as t where t.id = p_template_id for share;
  if v_template.id is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;
  -- Запуск ніколи не створюється з незбережених змін (глосарій PM; робоче припущення #21).
  if v_template.current_version is null then
    raise exception 'TEMPLATE_NOT_PUBLISHED';
  end if;

  select v.id, v.name into v_version_id, v_version_name
  from public.template_versions as v
  where v.template_id = p_template_id and v.number = v_template.current_version;
  if not exists (select 1 from public.template_version_tasks as vt where vt.version_id = v_version_id) then
    raise exception 'TEMPLATE_EMPTY';
  end if;

  -- AC-RUN-04: виконавець задачі поточної версії — лише manager чи admin; ключ не з цієї версії відкидаємо (PM #9).
  if jsonb_typeof(v_assignees) <> 'object' then
    raise exception 'INVALID_ASSIGNEE';
  end if;
  for v_item in select key, value from jsonb_each_text(v_assignees) loop
    if not exists (
      select 1 from public.template_version_tasks as vt
      where vt.version_id = v_version_id and vt.template_task_id::text = v_item.key
    ) then
      continue;
    end if;
    if not exists (
      select 1 from public.profiles as p
      where p.id::text = v_item.value and p.role in ('manager', 'admin')
    ) then
      raise exception 'INVALID_ASSIGNEE';
    end if;
    v_valid := v_valid || jsonb_build_object(v_item.key, v_item.value);
  end loop;

  -- AC-RUN-01, AC-RUN-05, AC-RUN-06, AC-EDITOR-06: один запуск «in progress» з номером поточної версії.
  insert into public.runs (template_id, template_name, template_version, case_name, run_manager_id)
  values (p_template_id, v_version_name, v_template.current_version, v_case_name, v_uid)
  returning id into v_run_id;

  -- AC-RUN-01, AC-RUN-02, AC-RUN-08, AC-RUN-09, AC-RUN-12: копія всіх задач і секцій версії «to do»; без перевіреного
  -- призначення — менеджер запуску.
  insert into public.run_tasks
    (run_id, template_task_id, section_name, section_position, position, name, required, assignee_id)
  select v_run_id, vt.template_task_id, vt.section_name, vt.section_position, vt.position, vt.name, vt.required,
         coalesce((v_valid ->> vt.template_task_id::text)::uuid, v_uid)
  from public.template_version_tasks as vt
  where vt.version_id = v_version_id;

  return v_run_id;
end;
$$;

revoke execute on function private.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function private.launch_run(uuid, text, jsonb) to authenticated;
