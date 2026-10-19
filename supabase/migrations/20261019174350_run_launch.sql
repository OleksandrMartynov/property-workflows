-- Зріз WS6, задача 1 (openspec/changes/impl-template-runs, D1–D5, D7): ролі manager/admin, шаблони,
-- запуски з копією задач, функція запуску і список можливих виконавців.
-- AC: AC-RUN-01 … AC-RUN-09; видимість запусків — основа для AC-TASK-06.

-- ── D1. Ролі з матриці прав requirements/product.md ─────────────────────────
-- Порядок важливий: старе правило → дані → default → нове правило (див. заголовок 20261012000000).
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'manager' where role = 'member';
alter table public.profiles alter column role set default 'manager';
alter table public.profiles
  add constraint profiles_role_check check (role in ('manager', 'admin'));

-- ── D2. Шаблони: секції й задачі ────────────────────────────────────────────
create table public.templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique constraint templates_name_check check (char_length(btrim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);

create table public.template_sections (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  name        text not null constraint template_sections_name_check check (char_length(btrim(name)) between 1 and 200),
  position    integer not null default 0
);
create index template_sections_template_id_idx on public.template_sections (template_id);

create table public.template_tasks (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.template_sections (id) on delete cascade,
  name       text not null constraint template_tasks_name_check check (char_length(btrim(name)) between 1 and 200),
  required   boolean not null default false,
  position   integer not null default 0
);
create index template_tasks_section_id_idx on public.template_tasks (section_id);

comment on table public.templates is
  'Шаблон процесу (Template). Створює й змінює лише адміністратор; у зрізі WS6 — без екрана, довідковими даними.';

alter table public.templates enable row level security;
alter table public.template_sections enable row level security;
alter table public.template_tasks enable row level security;

revoke all on table public.templates, public.template_sections, public.template_tasks from anon, authenticated;
grant select, insert, update, delete on table public.templates, public.template_sections, public.template_tasks
  to authenticated;
grant select, insert, update, delete on table public.templates, public.template_sections, public.template_tasks
  to service_role;

-- Бачать шаблони manager і admin; змінює лише admin (матриця прав: «Create and change templates» — admin).
create policy templates_select_app_users on public.templates
  for select to authenticated
  using ((select private.current_app_role()) in ('manager', 'admin'));
create policy templates_insert_admin on public.templates
  for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy templates_update_admin on public.templates
  for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy templates_delete_admin on public.templates
  for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

create policy template_sections_select_app_users on public.template_sections
  for select to authenticated
  using ((select private.current_app_role()) in ('manager', 'admin'));
create policy template_sections_insert_admin on public.template_sections
  for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy template_sections_update_admin on public.template_sections
  for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy template_sections_delete_admin on public.template_sections
  for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

create policy template_tasks_select_app_users on public.template_tasks
  for select to authenticated
  using ((select private.current_app_role()) in ('manager', 'admin'));
create policy template_tasks_insert_admin on public.template_tasks
  for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy template_tasks_update_admin on public.template_tasks
  for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy template_tasks_delete_admin on public.template_tasks
  for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

-- ── D3. Запуски з копією задач шаблону (AC-RUN-01, AC-RUN-02) ───────────────
create table public.runs (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid references public.templates (id) on delete set null,
  template_name  text not null,
  -- Назва випадку: 1–100 символів, без пробілів на краях (AC-RUN-03, AC-RUN-07; робоче припущення Q3).
  case_name      text not null constraint runs_case_name_check
                   check (case_name = btrim(case_name) and char_length(case_name) between 1 and 100),
  run_manager_id uuid not null references public.profiles (id),
  status         text not null default 'in_progress'
                   constraint runs_status_check check (status in ('in_progress', 'completed')),
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index runs_run_manager_id_idx on public.runs (run_manager_id);

create table public.run_tasks (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.runs (id) on delete cascade,
  -- Звідки скопійовано (без FK: шаблон можуть змінити чи видалити, а запуск лишається як був — AC-RUN-02).
  template_task_id uuid,
  section_name     text not null,
  section_position integer not null default 0,
  position         integer not null default 0,
  name             text not null,
  required         boolean not null,
  assignee_id      uuid not null references public.profiles (id),
  status           text not null default 'to_do' constraint run_tasks_status_check check (status in ('to_do', 'done')),
  done_at          timestamptz,
  done_by          uuid references public.profiles (id)
);
create index run_tasks_run_id_idx on public.run_tasks (run_id);
create index run_tasks_assignee_id_idx on public.run_tasks (assignee_id);

comment on table public.runs is
  'Запуск (Run) шаблону для випадку. Створює лише функція launch_run; статус змінюється лише через виконання задач.';
comment on table public.run_tasks is
  'Задача запуску — копія задачі шаблону на момент запуску з виконавцем (Assignee) і статусом.';

alter table public.runs enable row level security;
alter table public.run_tasks enable row level security;

revoke all on table public.runs, public.run_tasks from anon, authenticated;
-- Клієнт лише читає; запис — функціями launch_run (тут) і complete_task (задача 2).
grant select on table public.runs, public.run_tasks to authenticated;
grant select, insert, update, delete on table public.runs, public.run_tasks to service_role;

-- ── D7. Хто бачить запуск ───────────────────────────────────────────────────
-- security definer: читає runs і run_tasks в обхід RLS, тож політики не зациклюються (42P17).
create or replace function private.can_see_run(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_app_role()) = 'admin'
      or exists (
           select 1 from public.runs as r
           where r.id = p_run_id and r.run_manager_id = (select auth.uid())
         )
      or exists (
           select 1 from public.run_tasks as t
           where t.run_id = p_run_id and t.assignee_id = (select auth.uid())
         );
$$;

revoke execute on function private.can_see_run(uuid) from public, anon;
grant execute on function private.can_see_run(uuid) to authenticated;

-- Матриця прав «See runs»: manager — запуски, де він менеджер запуску або виконавець хоча б однієї задачі; admin — усі.
create policy runs_select_visible on public.runs
  for select to authenticated
  using (private.can_see_run(id));

-- Виконавець бачить статуси всіх задач запуску, а не лише своїх (припущення PM у вимозі #3).
create policy run_tasks_select_visible on public.run_tasks
  for select to authenticated
  using (private.can_see_run(run_id));

-- ── D4. Запуск шаблону однією транзакцією ───────────────────────────────────
-- p_assignees: {"<template_task_id>": "<user_id>"}; незгадані задачі — на менеджері запуску.
create or replace function private.launch_run(p_template_id uuid, p_case_name text, p_assignees jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_role      text;
  v_case_name text;
  v_template  text;
  v_run_id    uuid;
  v_assignees jsonb := coalesce(p_assignees, '{}'::jsonb);
  v_item      record;
begin
  select p.role into v_role from public.profiles as p where p.id = v_uid;
  -- Матриця прав «Launch a template»: manager і admin.
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin') then
    raise exception 'NOT_ALLOWED';
  end if;

  -- AC-RUN-03, AC-RUN-07: назва без пробілів на краях, 1–100 символів (робоче припущення Q3).
  v_case_name := regexp_replace(coalesce(p_case_name, ''), '^\s+|\s+$', '', 'g');
  if v_case_name = '' then
    raise exception 'CASE_NAME_REQUIRED';
  end if;
  if char_length(v_case_name) > 100 then
    raise exception 'CASE_NAME_TOO_LONG';
  end if;

  select t.name into v_template from public.templates as t where t.id = p_template_id;
  if v_template is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;
  if not exists (
    select 1 from public.template_tasks as tt
    join public.template_sections as s on s.id = tt.section_id
    where s.template_id = p_template_id
  ) then
    raise exception 'TEMPLATE_EMPTY';
  end if;

  -- AC-RUN-04: виконавець — лише задача цього шаблону і лише manager чи admin.
  if jsonb_typeof(v_assignees) <> 'object' then
    raise exception 'INVALID_ASSIGNEE';
  end if;
  for v_item in select key, value from jsonb_each_text(v_assignees) loop
    if not exists (
      select 1 from public.template_tasks as tt
      join public.template_sections as s on s.id = tt.section_id
      where s.template_id = p_template_id and tt.id::text = v_item.key
    ) then
      raise exception 'INVALID_TASK';
    end if;
    if not exists (
      select 1 from public.profiles as p
      where p.id::text = v_item.value and p.role in ('manager', 'admin')
    ) then
      raise exception 'INVALID_ASSIGNEE';
    end if;
  end loop;

  -- AC-RUN-01, AC-RUN-05, AC-RUN-06: один запуск «in progress», менеджер запуску — той, хто запускає.
  insert into public.runs (template_id, template_name, case_name, run_manager_id)
  values (p_template_id, v_template, v_case_name, v_uid)
  returning id into v_run_id;

  -- AC-RUN-01, AC-RUN-02, AC-RUN-08, AC-RUN-09: копія всіх задач «to do»; без призначення — менеджер запуску.
  insert into public.run_tasks
    (run_id, template_task_id, section_name, section_position, position, name, required, assignee_id)
  select v_run_id, tt.id, s.name, s.position, tt.position, tt.name, tt.required,
         coalesce((v_assignees ->> tt.id::text)::uuid, v_uid)
  from public.template_tasks as tt
  join public.template_sections as s on s.id = tt.section_id
  where s.template_id = p_template_id;

  return v_run_id;
end;
$$;

revoke execute on function private.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function private.launch_run(uuid, text, jsonb) to authenticated;

-- Обгортка для Data API (supabase.rpc('launch_run')): схема private через API не видна.
create or replace function public.launch_run(p_template_id uuid, p_case_name text, p_assignees jsonb default '{}'::jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.launch_run(p_template_id, p_case_name, p_assignees);
$$;

revoke execute on function public.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function public.launch_run(uuid, text, jsonb) to authenticated;

-- ── D5. Кого можна призначити виконавцем (AC-RUN-04; робоче припущення Q1) ──
-- Лише id і email менеджерів та адміністраторів; інші поля профілю RLS profiles і далі ховає.
create or replace function private.list_assignable_users()
returns table (id uuid, email text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email, p.role
  from public.profiles as p
  where (select private.current_app_role()) in ('manager', 'admin')
    and p.role in ('manager', 'admin')
  order by p.email;
$$;

revoke execute on function private.list_assignable_users() from public, anon;
grant execute on function private.list_assignable_users() to authenticated;

create or replace function public.list_assignable_users()
returns table (id uuid, email text, role text)
language sql
stable
security invoker
set search_path = ''
as $$
  select u.id, u.email, u.role from private.list_assignable_users() as u;
$$;

revoke execute on function public.list_assignable_users() from public, anon;
grant execute on function public.list_assignable_users() to authenticated;

-- ── Довідкові дані: шаблони (D2; «Templates already exist» — припущення PM) ──
-- Сид у хмарі виконується лише раз, тому шаблони — тут, ідемпотентно.
insert into public.templates (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Tenant move-in'),
  ('10000000-0000-0000-0000-000000000002', 'Apartment repair')
on conflict (id) do nothing;

insert into public.template_sections (id, template_id, name, position) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Before move-in', 1),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'Move-in day', 2),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', 'Assessment', 1),
  ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000002', 'Repair', 2)
on conflict (id) do nothing;

-- «Tenant move-in»: 2 секції, 5 задач, 3 обов'язкові (як у AC-RUN-01).
insert into public.template_tasks (id, section_id, name, required, position) values
  ('30000000-0000-0000-0000-000000000111', '20000000-0000-0000-0000-000000000011', 'Sign the lease agreement', true, 1),
  ('30000000-0000-0000-0000-000000000112', '20000000-0000-0000-0000-000000000011', 'Inspect the apartment', true, 2),
  ('30000000-0000-0000-0000-000000000113', '20000000-0000-0000-0000-000000000011', 'Order cleaning', false, 3),
  ('30000000-0000-0000-0000-000000000121', '20000000-0000-0000-0000-000000000012', 'Hand over the keys', true, 1),
  ('30000000-0000-0000-0000-000000000122', '20000000-0000-0000-0000-000000000012', 'Record meter readings', false, 2),
  ('30000000-0000-0000-0000-000000000211', '20000000-0000-0000-0000-000000000021', 'Inspect the damage', true, 1),
  ('30000000-0000-0000-0000-000000000212', '20000000-0000-0000-0000-000000000021', 'Get a repair quote', false, 2),
  ('30000000-0000-0000-0000-000000000221', '20000000-0000-0000-0000-000000000022', 'Carry out the repair', true, 1),
  ('30000000-0000-0000-0000-000000000222', '20000000-0000-0000-0000-000000000022', 'Final check with the tenant', true, 2)
on conflict (id) do nothing;
