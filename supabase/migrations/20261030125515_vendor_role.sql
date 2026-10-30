-- impl-vendor (зріз 3, solomchaak/property-workflows-spec#39): роль vendor — підрядник, виконавець задач, який бачить
-- лише свої задачі. Матриця прав PM для vendor: запуски — лише ті, де він виконавець хоча б однієї задачі, і в них
-- лише свої задачі; позначка — лише своєї задачі; шаблони, версії, email інших, запуск шаблону — ні. Кожне обмеження
-- діє й на прямі запити: заборонений запит відхиляється, нічого не змінює й нічого не розкриває.

-- ── 1. Набір ролей (порядок — як у заголовку 20261012000000_profiles_and_roles.sql) ─────────────────────────────
-- Даних не оновлюємо (нових значень немає), default лишається 'manager': тригер on_auth_user_created і далі вставляє
-- профіль менеджера, роль підрядника задає адміністратор (service_role; у навчальному проєкті — npm run users:demo).
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('manager', 'admin', 'vendor'));

-- ── 2. Підрядник бачить лише свої задачі (AC-VENDOR-04, AC-VENDOR-07) ───────────────────────────────────────────
-- Менеджер і адміністратор — як раніше (виконавець бачить статуси всіх задач запуску, припущення PM у #3); підрядник
-- — лише рядки, де він виконавець (виняток з того самого припущення). run_progress — security_invoker-view над
-- run_tasks, тож для підрядника вона рахує лише його задачі («Your tasks: N of K done», AC-VENDOR-03, AC-VENDOR-05).
alter policy run_tasks_select_visible on public.run_tasks
  using (
    (select auth.uid()) is not null
    and private.can_see_run(run_id)
    and ((select private.current_app_role()) is distinct from 'vendor' or assignee_id = (select auth.uid()))
  );

-- ── 3. Рядок запуску підряднику — лише через vendor_runs() ──────────────────────────────────────────────────────
-- runs містить назву шаблону й номер версії; матриця прав: «See which template version a run follows» — «—» для
-- vendor. RLS не ховає колонок, тож політика runs підрядника не пускає, а свої запуски він отримує функцією нижче —
-- лише назва випадку, статус, час запуску й лічильник своїх задач (AC-VENDOR-03, AC-VENDOR-06, Q11).
alter policy runs_select_visible on public.runs
  using (
    (select auth.uid()) is not null
    and private.can_see_run(id)
    and (select private.current_app_role()) is distinct from 'vendor'
  );

create or replace function private.vendor_runs(p_run_id uuid default null)
returns table (id uuid, case_name text, status text, created_at timestamptz, done bigint, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.case_name, r.status, r.created_at,
         count(*) filter (where t.status = 'done') as done,
         count(*) as total
  from public.runs as r
  join public.run_tasks as t on t.run_id = r.id and t.assignee_id = (select auth.uid())
  where (select private.current_app_role()) = 'vendor'
    and (p_run_id is null or r.id = p_run_id)
  group by r.id
  order by r.created_at desc, r.id;
$$;

revoke execute on function private.vendor_runs(uuid) from public, anon;
grant execute on function private.vendor_runs(uuid) to authenticated;

create or replace function public.vendor_runs(p_run_id uuid default null)
returns table (id uuid, case_name text, status text, created_at timestamptz, done bigint, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.case_name, v.status, v.created_at, v.done, v.total from private.vendor_runs(p_run_id) as v;
$$;

revoke execute on function public.vendor_runs(uuid) from public, anon;
grant execute on function public.vendor_runs(uuid) to authenticated;

-- ── 4. Вибір виконавця (AC-VENDOR-02): менеджер і адміністратор бачать і підрядників; лише id та email ──────────
-- Підряднику — 0 рядків: він не бачить email інших користувачів (матриця прав, AC-VENDOR-04).
create or replace function private.list_assignable_users()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email
  from public.profiles as p
  where (select private.current_app_role()) in ('manager', 'admin')
    and p.role in ('manager', 'admin', 'vendor')
  order by p.email;
$$;

-- ── 5. Запуск (AC-VENDOR-01, AC-VENDOR-09) ─────────────────────────────────────────────────────────────────────
-- Копія private.launch_run з 20261025151836_template_versions.sql; змінено лише перевірку виконавця: підрядник
-- може бути виконавцем. Запускає, як і раніше, лише manager чи admin — підрядник не запускає шаблон і не стає
-- менеджером запуску (LAUNCH_NOT_ALLOWED, запуск не створено).
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
  -- Матриця прав «Launch a template»: manager і admin (AC-VENDOR-09 — vendor ні).
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

  -- AC-RUN-04, AC-VENDOR-01: виконавець задачі поточної версії — manager, admin або vendor; ключ не з цієї версії
  -- відкидаємо (PM #9).
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
      where p.id::text = v_item.value and p.role in ('manager', 'admin', 'vendor')
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

-- ── 6. Позначка задачі (AC-VENDOR-05, AC-VENDOR-07) ────────────────────────────────────────────────────────────
-- Копія private.complete_task з 20261021093442_complete_task_confirmation.sql; змінено перевірку ролі (vendor
-- допущено) і додано окрему перевірку для vendor: лише своя задача; чужа лишається «to do» (NOT_ALLOWED).
create or replace function private.complete_task(p_task_id uuid, p_confirmed boolean default false)
returns table (task_status text, run_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_role    text;
  v_task    public.run_tasks;
  v_run     public.runs;
begin
  select p.role into v_role from public.profiles as p where p.id = v_uid;
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin', 'vendor') then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Блокуємо рядок задачі й запуск: дві одночасні позначки не порахують завершення двічі.
  select * into v_task from public.run_tasks as t where t.id = p_task_id for update;
  if v_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  select * into v_run from public.runs as r where r.id = v_task.run_id for update;

  -- AC-VENDOR-05, AC-VENDOR-07: підрядник — лише задача, де він виконавець, незалежно від run_manager_id (користувач,
  -- переведений адміністратором із manager у vendor, не позначає задач своїх колишніх запусків).
  if v_role = 'vendor' and v_task.assignee_id is distinct from v_uid then
    raise exception 'NOT_ALLOWED';
  end if;

  -- AC-TASK-01 (виконавець), AC-TASK-02 (менеджер запуску), AC-TASK-07 (адміністратор); інші — AC-TASK-03.
  if not (v_role = 'admin' or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid) then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Повторна позначка вже «done» задачі нічого не змінює (припущення PM, вимога #3).
  if v_task.status = 'done' then
    return query select v_task.status, v_run.status;
    return;
  end if;

  -- Позначка — лише в запуску «in progress»; необов'язкова задача після «completed» — PM-Q1, не специфікуємо.
  if v_run.status <> 'in_progress' then
    raise exception 'RUN_COMPLETED';
  end if;

  -- AC-TASK-04, AC-TASK-16: остання обов'язкова задача (решта обов'язкових уже «done») — лише з підтвердженням;
  -- для підрядника так само (припущення PM у #39).
  if v_task.required
     and not coalesce(p_confirmed, false)
     and not exists (
       select 1 from public.run_tasks as t
       where t.run_id = v_run.id and t.required and t.status <> 'done' and t.id <> v_task.id
     ) then
    raise exception 'CONFIRMATION_REQUIRED';
  end if;

  update public.run_tasks
  set status = 'done', done_at = now(), done_by = v_uid
  where id = v_task.id;

  -- AC-TASK-04: усі обов'язкові задачі «done» — запуск «completed»; необов'язкові задачі не змінюються.
  if not exists (
    select 1 from public.run_tasks as t
    where t.run_id = v_run.id and t.required and t.status <> 'done'
  ) then
    update public.runs set status = 'completed', completed_at = now() where id = v_run.id;
    v_run.status := 'completed';
  end if;

  return query select 'done'::text, v_run.status;
end;
$$;

-- ── 7. Остання обов'язкова задача для підтвердження (припущення PM у #39) ────────────────────────────────────────
-- Сторінка підрядника бачить лише його задачі й не може сама порахувати «остання обов'язкова задача запуску». Функція
-- повертає id цієї задачі, лише якщо вона одна, викликач бачить запуск і (для підрядника) задача — його; інакше null.
-- Розкриває не більше, ніж показує діалог підтвердження.
create or replace function private.run_last_required_task(p_run_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 1 then min(t.id::text)::uuid end
  from public.run_tasks as t
  where t.run_id = p_run_id and t.required and t.status <> 'done'
    and private.can_see_run(p_run_id)
    and exists (select 1 from public.runs as r where r.id = p_run_id and r.status = 'in_progress')
  having (select private.current_app_role()) is distinct from 'vendor'
      or bool_and(t.assignee_id = (select auth.uid()));
$$;

revoke execute on function private.run_last_required_task(uuid) from public, anon;
grant execute on function private.run_last_required_task(uuid) to authenticated;

create or replace function public.run_last_required_task(p_run_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select private.run_last_required_task(p_run_id);
$$;

revoke execute on function public.run_last_required_task(uuid) from public, anon;
grant execute on function public.run_last_required_task(uuid) to authenticated;
