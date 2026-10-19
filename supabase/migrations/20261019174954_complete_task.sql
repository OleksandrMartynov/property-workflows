-- Зріз WS6, задача 2 (openspec/changes/impl-template-runs, D6): позначка задачі виконаною і завершення запуску.
-- AC: AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-04, AC-TASK-07.
-- run_tasks і runs не мають grant на update для клієнта (міграція 20261019174350): статус змінює лише ця функція.

create or replace function private.complete_task(p_task_id uuid)
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

  -- Позначка — лише в запуску «in progress» (специфікація run-progress, «Позначка задачі виконаною»);
  -- що робити з необов'язковою задачею після «completed», PM свідомо не специфікує (PM-Q1 у вимозі #3).
  if v_run.status <> 'in_progress' then
    raise exception 'RUN_COMPLETED';
  end if;

  update public.run_tasks
  set status = 'done', done_at = now(), done_by = v_uid
  where id = v_task.id;

  -- AC-TASK-04: усі обов'язкові задачі «done» — запуск «completed»; необовʼязкові задачі не змінюються.
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

revoke execute on function private.complete_task(uuid) from public, anon;
grant execute on function private.complete_task(uuid) to authenticated;

-- Обгортка для Data API (supabase.rpc('complete_task')).
create or replace function public.complete_task(p_task_id uuid)
returns table (task_status text, run_status text)
language sql
security invoker
set search_path = ''
as $$
  select c.task_status, c.run_status from private.complete_task(p_task_id) as c;
$$;

revoke execute on function public.complete_task(uuid) from public, anon;
grant execute on function public.complete_task(uuid) to authenticated;
