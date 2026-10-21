-- impl-clarify-template-runs, D11 (AC-RUN-04; рішення PM https://github.com/solomchaak/property-workflows-spec/issues/9):
-- «момент запуску» — підтвердження запуску. Задачі, прибраної з шаблону після відкриття форми, у запуску немає, а
-- призначення для неї відкидається: запуск не падає з INVALID_TASK, як раніше. Задача, додана тим часом, — на менеджері
-- запуску (coalesce(…, v_uid), без змін). Сигнатура та сама, тож create or replace; права — повторно, явно.

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

  -- AC-RUN-04: виконавець задачі шаблону — лише manager чи admin. Ключ, що не є задачею цього шаблону (задачу
  -- прибрали після відкриття форми), пропускаємо: таке призначення відкидається (D11).
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
  end loop;

  -- AC-RUN-01, AC-RUN-05, AC-RUN-06: один запуск «in progress», менеджер запуску — той, хто запускає.
  insert into public.runs (template_id, template_name, case_name, run_manager_id)
  values (p_template_id, v_template, v_case_name, v_uid)
  returning id into v_run_id;

  -- AC-RUN-01, AC-RUN-02, AC-RUN-08, AC-RUN-09, AC-RUN-12: копія всіх задач і секцій «to do»; без призначення —
  -- менеджер запуску. Призначення для задач поза шаблоном сюди не потрапляють: беремо лише задачі шаблону.
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
