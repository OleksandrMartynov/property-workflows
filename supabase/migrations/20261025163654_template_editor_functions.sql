-- Функції редактора шаблону (зріз 2, рев'ю PR #25). Переміщення секції чи задачі вгору / вниз — обмін позицій із сусідом —
-- одна транзакція й один update, тож дві секції чи задачі не отримають однакову позицію, якщо другий запит упав.
-- Порядок секцій і задач — частина версії (AC-RUN-12, AC-TASK-12), а змінювати незбережені зміни може лише admin
-- (AC-EDITOR-08): роль перевіряє і сама функція (як save_template_version), і RLS (security invoker).

create or replace function public.move_template_item(p_template_id uuid, p_kind text, p_id uuid, p_direction text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_parent   uuid;
  v_pos      integer;
  v_other    uuid;
  v_other_pos integer;
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_direction not in ('up', 'down') or p_kind not in ('section', 'task') then
    raise exception 'DB_ERROR';
  end if;
  -- Спершу рядок шаблону, як у решти функцій редактора: однаковий порядок блокувань (шаблон → секція / задача)
  -- не дає deadlock із паралельним додаванням чи перенесенням задачі (тригер незбережених змін оновлює той самий шаблон).
  perform 1 from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'DB_ERROR';
  end if;

  if p_kind = 'section' then
    -- for update: два переміщення в одному шаблоні йдуть по черзі й бачать позиції одне одного.
    select s.template_id, s.position into v_parent, v_pos
    from public.template_sections as s
    where s.id = p_id and s.template_id = p_template_id
    for update;
    if not found then
      raise exception 'DB_ERROR';
    end if;
    select s.id, s.position into v_other, v_other_pos
    from public.template_sections as s
    where s.template_id = v_parent
      and case when p_direction = 'up' then s.position < v_pos else s.position > v_pos end
    order by case when p_direction = 'up' then -s.position else s.position end
    limit 1
    for update;
    if v_other is null then
      return; -- на краю — нічого не змінюємо
    end if;
    update public.template_sections as s
    set position = case when s.id = p_id then v_other_pos else v_pos end
    where s.id in (p_id, v_other);
  else
    -- Задача цього шаблону: секцію перевіряємо через template_id.
    select t.section_id, t.position into v_parent, v_pos
    from public.template_tasks as t
    join public.template_sections as s on s.id = t.section_id
    where t.id = p_id and s.template_id = p_template_id
    for update of t;
    if not found then
      raise exception 'DB_ERROR';
    end if;
    select t.id, t.position into v_other, v_other_pos
    from public.template_tasks as t
    where t.section_id = v_parent
      and case when p_direction = 'up' then t.position < v_pos else t.position > v_pos end
    order by case when p_direction = 'up' then -t.position else t.position end
    limit 1
    for update;
    if v_other is null then
      return;
    end if;
    update public.template_tasks as t
    set position = case when t.id = p_id then v_other_pos else v_pos end
    where t.id in (p_id, v_other);
  end if;
end;
$$;

revoke execute on function public.move_template_item(uuid, text, uuid, text) from public, anon;
grant execute on function public.move_template_item(uuid, text, uuid, text) to authenticated;

-- ── Нова секція чи задача — в кінець списку, атомарно (рев'ю PR #25) ─────────────────────────────────────────
-- Позицію рахуємо й вставляємо в одній транзакції під блокуванням рядка шаблону: два паралельні додавання (подвійне
-- натискання, два вікна редактора) ідуть по черзі й не отримають однакову позицію. Роль admin — як у move_template_item.

create or replace function public.add_template_section(p_template_id uuid, p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
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
  insert into public.template_sections (template_id, name, position)
  select p_template_id, btrim(p_name), coalesce(max(s.position), 0) + 1
  from public.template_sections as s
  where s.template_id = p_template_id
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.add_template_task(p_template_id uuid, p_section_id uuid, p_name text, p_required boolean)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  -- Секція — лише цього шаблону: id з форми не довіряємо.
  perform 1 from public.template_sections as s where s.id = p_section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  insert into public.template_tasks (section_id, name, required, position)
  select p_section_id, btrim(p_name), coalesce(p_required, false), coalesce(max(t.position), 0) + 1
  from public.template_tasks as t
  where t.section_id = p_section_id
  returning id into v_id;
  return v_id;
end;
$$;

-- Перенесення задачі в іншу секцію того самого шаблону — у кінець цільової секції, тим самим способом.
create or replace function public.move_template_task_to_section(p_template_id uuid, p_task_id uuid, p_section_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from uuid;
begin
  if (select auth.uid()) is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED';
  end if;
  perform 1 from public.templates as t where t.id = p_template_id for update;
  select t.section_id into v_from
  from public.template_tasks as t
  join public.template_sections as s on s.id = t.section_id
  where t.id = p_task_id and s.template_id = p_template_id;
  if v_from is null then
    raise exception 'DB_ERROR';
  end if;
  perform 1 from public.template_sections as s where s.id = p_section_id and s.template_id = p_template_id;
  if not found then
    raise exception 'DB_ERROR';
  end if;
  if v_from = p_section_id then
    return;
  end if;
  update public.template_tasks as t
  set section_id = p_section_id,
      position = (select coalesce(max(x.position), 0) + 1 from public.template_tasks as x where x.section_id = p_section_id)
  where t.id = p_task_id;
end;
$$;

revoke execute on function public.add_template_section(uuid, text) from public, anon;
revoke execute on function public.add_template_task(uuid, uuid, text, boolean) from public, anon;
revoke execute on function public.move_template_task_to_section(uuid, uuid, uuid) from public, anon;
grant execute on function public.add_template_section(uuid, text) to authenticated;
grant execute on function public.add_template_task(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.move_template_task_to_section(uuid, uuid, uuid) to authenticated;
