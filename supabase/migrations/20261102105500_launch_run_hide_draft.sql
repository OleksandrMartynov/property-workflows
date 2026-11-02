-- Менеджер, що напряму запускає шаблон без збереженої версії, отримує TEMPLATE_NOT_FOUND, як в AC-EDITOR-16: відповідь
-- TEMPLATE_NOT_PUBLISHED підтверджувала, що чернетка з таким id існує, хоча менеджер її не бачить (AC-EDITOR-02).
-- Адміністратор бачить чернетку, тож код для нього той самий (AC-EDITOR-11).
-- Копія private.launch_run з 20261030125515_vendor_role.sql; змінено лише цю перевірку.
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
  -- Шаблон без версії існує лише для адміністратора: іншим — як неіснуючий, інакше код відповіді підтверджує його id.
  if v_template.current_version is null then
    if v_role = 'admin' then
      raise exception 'TEMPLATE_NOT_PUBLISHED';
    end if;
    raise exception 'TEMPLATE_NOT_FOUND';
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
