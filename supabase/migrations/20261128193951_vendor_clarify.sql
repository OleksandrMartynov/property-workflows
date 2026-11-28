-- Уточнення зрізу 3 після відповідей PM (openspec/changes/impl-clarify-vendor, задача 1):
-- AC-VENDOR-07 і AC-TASK-03 — текст відмови PM у деталях помилки прямого запиту;
-- AC-VENDOR-15 — прямий запит підрядника на задачу запуску, де в нього немає задач: «Run not found»;
-- AC-VENDOR-16 і AC-TASK-19 — необов'язкову задачу завершеного запуску можна позначити, запуск лишається «completed».
--
-- Нова версія private.complete_task — копія з 20261030125515_vendor_role.sql (остання версія); решта логіки без змін:
-- повтор на «done», підтвердження останньої обов'язкової задачі (AC-TASK-04, AC-TASK-16), завершення запуску.
-- create or replace зберігає права (execute лише authenticated) і обгортку public.complete_task.

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
  -- Дослівні тексти PM: прямий запит (оминаючи сторінки) отримує їх у details; код лишається в message для застосунку.
  c_not_allowed   constant text := 'Only the task''s assignee, the run manager, or an administrator can mark a task as done';
  c_run_not_found constant text := 'Run not found';
begin
  select p.role into v_role from public.profiles as p where p.id = v_uid;
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin', 'vendor') then
    raise exception 'NOT_ALLOWED' using detail = c_not_allowed;
  end if;

  -- Блокуємо рядок задачі й запуск: дві одночасні позначки не порахують завершення двічі.
  select * into v_task from public.run_tasks as t where t.id = p_task_id for update;
  if v_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  select * into v_run from public.runs as r where r.id = v_task.run_id for update;

  if v_role = 'vendor' then
    -- AC-VENDOR-15: запуск, де в підрядника немає жодної задачі, для нього не існує — «Run not found», нічого не змінено.
    if not exists (select 1 from public.run_tasks as t where t.run_id = v_run.id and t.assignee_id = v_uid) then
      raise exception 'RUN_NOT_FOUND' using detail = c_run_not_found;
    end if;
    -- AC-VENDOR-05, AC-VENDOR-07: лише задача, де він виконавець, незалежно від run_manager_id.
    if v_task.assignee_id is distinct from v_uid then
      raise exception 'NOT_ALLOWED' using detail = c_not_allowed;
    end if;
  end if;

  -- AC-TASK-01 (виконавець), AC-TASK-02 (менеджер запуску), AC-TASK-07 (адміністратор); інші — AC-TASK-03.
  if not (v_role = 'admin' or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid) then
    raise exception 'NOT_ALLOWED' using detail = c_not_allowed;
  end if;

  -- Повторна позначка вже «done» задачі нічого не змінює (припущення PM, вимога #3).
  if v_task.status = 'done' then
    return query select v_task.status, v_run.status;
    return;
  end if;

  -- AC-TASK-19, AC-VENDOR-16: у завершеному запуску можна позначити необов'язкову задачу; обов'язкових «to do» там не
  -- буває (запуск завершується, коли всі обов'язкові «done»), тож відмова лишається лише як захист цілісності.
  if v_run.status <> 'in_progress' and (v_run.status <> 'completed' or v_task.required) then
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

  -- AC-TASK-04: усі обов'язкові задачі «done» — запуск «completed»; уже завершений запуск не чіпаємо (AC-TASK-19:
  -- лишається «completed», completed_at не змінюється).
  if v_run.status = 'in_progress' and not exists (
    select 1 from public.run_tasks as t
    where t.run_id = v_run.id and t.required and t.status <> 'done'
  ) then
    update public.runs set status = 'completed', completed_at = now() where id = v_run.id;
    v_run.status := 'completed';
  end if;

  return query select 'done'::text, v_run.status;
end;
$$;
