-- ADR 0003 (AC-RUN-01, AC-RUN-02, AC-RUN-04): запуск — атомарний знімок шаблону. Оцінка ризиків CodeRabbit у PR #13
-- (inferred): призначення, пропущене під час перевірки (задачі ще не було в шаблоні), могло б потрапити в копію задач,
-- якщо задачу додали між перевіркою й копіюванням. Тепер:
--   1) шаблон і його секції блокуються `for update`, задачі — `for share` до кінця транзакції. `for update` конфліктує з
--      `for key share`, який бере вставка дочірнього рядка (перевірка зовнішнього ключа), тож адміністратор не додасть
--      секцію чи задачу і не змінить / не видалить наявні посеред запуску — його запит чекатиме. Перевірка й копія
--      бачать той самий шаблон («момент запуску», PM #9). Ціна: запуски одного шаблону йдуть по черзі (мілісекунди);
--   2) копія бере виконавців лише з перевірених призначень (v_valid), а не з сирого p_assignees.
-- Сигнатура та сама, тож create or replace; права — повторно, явно.

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
  v_valid     jsonb := '{}'::jsonb;
  v_item      record;
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

  -- Знімок шаблону до кінця транзакції (ADR 0003): шаблон і секції — for update (блокує й вставку дочірніх рядків),
  -- задачі — for share (блокує їх зміну й видалення).
  select t.name into v_template from public.templates as t where t.id = p_template_id for update;
  if v_template is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;
  perform 1 from public.template_sections as s where s.template_id = p_template_id for update;
  perform 1
  from public.template_tasks as tt
  join public.template_sections as s on s.id = tt.section_id
  where s.template_id = p_template_id
  for share of tt;
  if not exists (
    select 1 from public.template_tasks as tt
    join public.template_sections as s on s.id = tt.section_id
    where s.template_id = p_template_id
  ) then
    raise exception 'TEMPLATE_EMPTY';
  end if;

  -- AC-RUN-04: виконавець задачі шаблону — лише manager чи admin. Ключ, що не є задачею цього шаблону (задачу
  -- прибрали після відкриття форми), відкидаємо (рішення PM #9). У копію йдуть лише перевірені призначення.
  if jsonb_typeof(v_assignees) <> 'object' then
    raise exception 'INVALID_ASSIGNEE';
  end if;
  for v_item in select key, value from jsonb_each_text(v_assignees) loop
    if not exists (
      select 1 from public.template_tasks as tt
      join public.template_sections as s on s.id = tt.section_id
      where s.template_id = p_template_id and tt.id::text = v_item.key
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

  -- AC-RUN-01, AC-RUN-05, AC-RUN-06: один запуск «in progress», менеджер запуску — той, хто запускає.
  insert into public.runs (template_id, template_name, case_name, run_manager_id)
  values (p_template_id, v_template, v_case_name, v_uid)
  returning id into v_run_id;

  -- AC-RUN-01, AC-RUN-02, AC-RUN-08, AC-RUN-09, AC-RUN-12: копія всіх задач і секцій «to do»; без перевіреного
  -- призначення — менеджер запуску.
  insert into public.run_tasks
    (run_id, template_task_id, section_name, section_position, position, name, required, assignee_id)
  select v_run_id, tt.id, s.name, s.position, tt.position, tt.name, tt.required,
         coalesce((v_valid ->> tt.id::text)::uuid, v_uid)
  from public.template_tasks as tt
  join public.template_sections as s on s.id = tt.section_id
  where s.template_id = p_template_id;

  return v_run_id;
end;
$$;

revoke execute on function private.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function private.launch_run(uuid, text, jsonb) to authenticated;
