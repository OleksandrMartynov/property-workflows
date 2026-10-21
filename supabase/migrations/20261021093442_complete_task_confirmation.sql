-- impl-clarify-template-runs, D13 (AC-TASK-04, AC-TASK-16; припущення PM у вимозі #3): позначка останньої
-- обов'язкової задачі запуску — лише після підтвердження. Без p_confirmed = true функція кидає CONFIRMATION_REQUIRED і
-- нічого не змінює: «done лише після підтвердження» тримає база, а не тільки діалог в інтерфейсі.
-- Сигнатура змінюється (новий параметр), тож drop + create; права — заново, явно.

drop function if exists public.complete_task(uuid);
drop function if exists private.complete_task(uuid);

create function private.complete_task(p_task_id uuid, p_confirmed boolean default false)
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
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin') then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Блокуємо рядок задачі й запуск: дві одночасні позначки не порахують завершення двічі.
  select * into v_task from public.run_tasks as t where t.id = p_task_id for update;
  if v_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  select * into v_run from public.runs as r where r.id = v_task.run_id for update;

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

  -- AC-TASK-04, AC-TASK-16: остання обов'язкова задача (решта обов'язкових уже «done») — лише з підтвердженням.
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

revoke execute on function private.complete_task(uuid, boolean) from public, anon;
grant execute on function private.complete_task(uuid, boolean) to authenticated;

-- Обгортка для Data API (supabase.rpc('complete_task', { p_task_id, p_confirmed })).
create function public.complete_task(p_task_id uuid, p_confirmed boolean default false)
returns table (task_status text, run_status text)
language sql
security invoker
set search_path = ''
as $$
  select c.task_status, c.run_status from private.complete_task(p_task_id, p_confirmed) as c;
$$;

revoke execute on function public.complete_task(uuid, boolean) from public, anon;
grant execute on function public.complete_task(uuid, boolean) to authenticated;
