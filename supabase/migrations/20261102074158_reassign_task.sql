-- Зміна виконавця задачі в запуску: менеджер запуску або адміністратор передає задачу «to do» іншому користувачу.
-- Новий виконавець — manager, admin або vendor (той самий набір, що й у виборі виконавця під час запуску,
-- AC-VENDOR-01, AC-VENDOR-02). Перевірка прав і запис — однією функцією бази (як complete_task), бо в supabase-js
-- немає транзакцій. Прямого update рядків run_tasks користувачі й далі не мають.

create or replace function private.reassign_task(p_task_id uuid, p_assignee_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role text;
  v_task public.run_tasks;
  v_run  public.runs;
begin
  select p.role into v_role from public.profiles as p where p.id = v_uid;
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin', 'vendor') then
    raise exception 'REASSIGN_NOT_ALLOWED';
  end if;

  -- Блокуємо рядок задачі й запуск, як у complete_task: одночасні позначка й зміна виконавця не перетнуться.
  select * into v_task from public.run_tasks as t where t.id = p_task_id for update;
  if v_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  select * into v_run from public.runs as r where r.id = v_task.run_id for update;

  -- Ті самі права, що й у complete_task.
  if not (v_role = 'admin' or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid) then
    raise exception 'REASSIGN_NOT_ALLOWED';
  end if;

  if v_run.status <> 'in_progress' then
    raise exception 'RUN_COMPLETED';
  end if;

  if not exists (
    select 1 from public.profiles as p
    where p.id = p_assignee_id and p.role in ('manager', 'admin', 'vendor')
  ) then
    raise exception 'INVALID_ASSIGNEE';
  end if;

  update public.run_tasks set assignee_id = p_assignee_id where id = v_task.id;
  return v_task.id;
end;
$$;

revoke execute on function private.reassign_task(uuid, uuid) from public, anon;
grant execute on function private.reassign_task(uuid, uuid) to authenticated;

create or replace function public.reassign_task(p_task_id uuid, p_assignee_id uuid)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.reassign_task(p_task_id, p_assignee_id);
$$;

revoke execute on function public.reassign_task(uuid, uuid) from public, anon;
grant execute on function public.reassign_task(uuid, uuid) to authenticated;
