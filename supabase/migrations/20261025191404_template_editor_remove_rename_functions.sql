-- Видалення й перейменування секції чи задачі — функціями бази (наступний PR після #25). Прямий запис у робочі таблиці
-- блокував спершу секцію чи задачу, а тригер незбережених змін потім — рядок шаблону: порядок «задача → шаблон»,
-- протилежний до функцій редактора (20261025163654_template_editor_functions.sql, «шаблон → секція / задача»). Дві
-- паралельні зміни одного шаблону могли дати deadlock. Тут, як і там, першим кроком блокуємо рядок шаблону.
-- Роль admin перевіряє сама функція і RLS (security invoker); id секції чи задачі з форми не довіряємо — лише цього
-- шаблону (AC-EDITOR-01, AC-EDITOR-08).

create or replace function public.remove_template_section(p_template_id uuid, p_section_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  -- Задачі секції видаляє каскад (template_tasks.section_id on delete cascade), уже під блокуванням шаблону.
  delete from public.template_sections as s where s.id = p_section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
end;
$$;

create or replace function public.rename_template_section(p_template_id uuid, p_section_id uuid, p_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  update public.template_sections as s
  set name = btrim(p_name)
  where s.id = p_section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
end;
$$;

create or replace function public.remove_template_task(p_template_id uuid, p_task_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  -- Задача цього шаблону: секцію перевіряємо через template_id.
  delete from public.template_tasks as t
  using public.template_sections as s
  where t.id = p_task_id and s.id = t.section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
end;
$$;

-- Назва й позначка «Required» задачі — одна зміна (форма «Update» редактора).
create or replace function public.update_template_task(p_template_id uuid, p_task_id uuid, p_name text, p_required boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  update public.template_tasks as t
  set name = btrim(p_name), required = coalesce(p_required, false)
  from public.template_sections as s
  where t.id = p_task_id and s.id = t.section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
end;
$$;

revoke execute on function public.remove_template_section(uuid, uuid) from public, anon;
revoke execute on function public.rename_template_section(uuid, uuid, text) from public, anon;
revoke execute on function public.remove_template_task(uuid, uuid) from public, anon;
revoke execute on function public.update_template_task(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.remove_template_section(uuid, uuid) to authenticated;
grant execute on function public.rename_template_section(uuid, uuid, text) to authenticated;
grant execute on function public.remove_template_task(uuid, uuid) to authenticated;
grant execute on function public.update_template_task(uuid, uuid, text, boolean) to authenticated;
