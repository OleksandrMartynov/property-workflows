-- Pre-merge перевірка CodeRabbit у PR #6 («Міграції: RLS, GRANT і політики»): AGENTS.md вимагає політику на кожну
-- операцію `to authenticated` з `(select auth.uid())`. Політики шаблонів і запусків спиралися лише на
-- private.current_app_role() / private.can_see_run(), які самі читають auth.uid(). Тепер кожна політика явно вимагає
-- автентифікованого користувача: `(select auth.uid()) is not null and …`. Права за ролями не змінюються.
-- Застосовану міграцію 20261019174350_run_launch.sql не редагуємо — лише alter policy.

-- Шаблони (AC-RUN-01, AC-RUN-02: бачать manager і admin, змінює лише admin).
alter policy templates_select_app_users on public.templates
  using ((select auth.uid()) is not null and (select private.current_app_role()) in ('manager', 'admin'));
alter policy templates_insert_admin on public.templates
  with check ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy templates_update_admin on public.templates
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin')
  with check ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy templates_delete_admin on public.templates
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');

alter policy template_sections_select_app_users on public.template_sections
  using ((select auth.uid()) is not null and (select private.current_app_role()) in ('manager', 'admin'));
alter policy template_sections_insert_admin on public.template_sections
  with check ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy template_sections_update_admin on public.template_sections
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin')
  with check ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy template_sections_delete_admin on public.template_sections
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');

alter policy template_tasks_select_app_users on public.template_tasks
  using ((select auth.uid()) is not null and (select private.current_app_role()) in ('manager', 'admin'));
alter policy template_tasks_insert_admin on public.template_tasks
  with check ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy template_tasks_update_admin on public.template_tasks
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin')
  with check ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');
alter policy template_tasks_delete_admin on public.template_tasks
  using ((select auth.uid()) is not null and (select private.current_app_role()) = 'admin');

-- Запуски й задачі запусків (AC-TASK-06, AC-TASK-10: менеджер запуску, виконавець або admin).
alter policy runs_select_visible on public.runs
  using ((select auth.uid()) is not null and private.can_see_run(id));
alter policy run_tasks_select_visible on public.run_tasks
  using ((select auth.uid()) is not null and private.can_see_run(run_id));
