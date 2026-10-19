-- Зріз WS6, задача 3 (openspec/changes/impl-template-runs, D8): прогрес запуску рахує база.
-- AC: AC-TASK-09 (і AC-TASK-05): «N of M done», де N — задачі «done», M — усі задачі запуску.
-- Чому view, а не підрахунок у застосунку: запит run_tasks зі списку запусків обрізається лімітом рядків Data API
-- (рев'ю CodeRabbit у PR #8), а агрегат по run_id — завжди один рядок на запуск.
--
-- security_invoker = true: view виконується з правами того, хто читає, тож діють RLS і GRANT таблиці run_tasks
-- (політика run_tasks_select_visible) — менеджер бачить прогрес лише видимих йому запусків (AC-TASK-06).
-- RLS на самому view не вмикається (Postgres так не вміє); захист — security_invoker + явні grant нижче.
create view public.run_progress
with (security_invoker = true)
as
select t.run_id,
       (count(*) filter (where t.status = 'done'))::integer as done,
       count(*)::integer as total
from public.run_tasks as t
group by t.run_id;

comment on view public.run_progress is
  'Прогрес запуску: done — задачі зі статусом done, total — усі задачі запуску. RLS — від run_tasks (security_invoker).';

revoke all on table public.run_progress from anon, authenticated;
grant select on table public.run_progress to authenticated;
grant select on table public.run_progress to service_role;
