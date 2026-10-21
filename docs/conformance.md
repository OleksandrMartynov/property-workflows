# Матриця відповідності (AC → код → тест → статус)

<!--
Ваша матриця: один рядок на кожен AC з openspec/specs/** — вашої специфікації, у яку ви перекладаєте вимоги PM
(їхній знімок у requirements/ приносить команда агента /requirements-sync).
Рядок «Вимоги» під цим коментарем заповнює лише /requirements-sync: адреса репо вимог PM, звідки взято вимоги (issues
або файли docs/), і дата знімка, через « · ». Руками його не змінюйте: з нього /requirements-sync знає, звідки брати
вимоги наступного разу, а скіли spec-clarify, spec-review і /conformance — куди ставити питання й яку версію вимог ви
реалізуєте. Рядків таблиці /requirements-sync не додає.
Рядки змінюєте ви:
  PR «Специфікація» — після archive зміни: рядок кожного нового AC зі статусом «відкладено (чекає реалізації)»; рядки AC,
                      прибраних зі специфікації (REMOVED), — видалити;
  PR «Реалізація»   — рядок AC задачі в тому самому PR, що й код і тест.
Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — PR «Специфікація» без нових рядків або рядок видалено);
  MISSING    статус «реалізовано», а непропущеного тесту, назва якого починається з цього AC ID, у файлах
             *.test.ts / *.test.tsx немає (*.spec.ts і допоміжні файли Vitest не запускає — вони не рахуються);
  ORPHAN     тест посилається на AC, якого немає в специфікації (AC прибрано або вимогу PM ще не перекладено);
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі;
і попереджає, не падаючи: AC з вимог PM (requirements/), якого ще немає в openspec/specs/, — «вимогу PM ще не перекладено
в специфікацію».

Приклад рядків (усередині коментаря — скрипт їх не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаю відповідь PM на Q2, <pm>/<team-slug>-spec#5) |
| AC-LEAVE-07 | менеджер бачить лише свій відділ | — | — | відкладено (рішення PM: поза зрізом 1, <pm>/<team-slug>-spec#8) |
| AC-LEAVE-10 | діапазон лише із заблокованих днів | — | — | відкладено (чекає реалізації) |
-->

Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-21

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-RUN-01 | запуск шаблону з 5 задачами дає один запуск «in progress» з 5 задачами «to do» | `supabase/migrations/20261019174350_run_launch.sql` (private.launch_run), `src/app/runs/actions.ts` (launchRun) | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-RUN-02 | зміна шаблону після запуску не змінює задач запуску | `supabase/migrations/20261019174350_run_launch.sql` (run_tasks — копія), `src/app/runs/[id]/page.tsx` | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-RUN-03 | порожня назва випадку або лише пробіли — запуску немає, «Enter a case name» | `src/lib/runs/case-name.ts` (validateCaseName), `src/app/runs/actions.ts` (launchRun) | `tests/runs/case-name.test.ts` | реалізовано |
| AC-RUN-04 | дві задачі призначено менеджеру B, решта три — менеджер A | `src/lib/runs/assignees.ts` (collectAssignees), `supabase/migrations/20261019174350_run_launch.sql` (private.launch_run) | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-RUN-05 | адміністратор запускає шаблон і стає менеджером запуску | `supabase/migrations/20261019174350_run_launch.sql` (private.launch_run) | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-RUN-06 | менеджер запускає шаблон і стає менеджером запуску | `supabase/migrations/20261019174350_run_launch.sql` (private.launch_run) | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-RUN-07 | назва випадку 101 символ — запуску немає, «Case name must be at most 100 characters» | `src/lib/runs/case-name.ts` (validateCaseName), `src/app/runs/actions.ts` (launchRun) | `tests/runs/case-name.test.ts` | реалізовано |
| AC-RUN-08 | менеджер без призначень — виконавець усіх 5 задач | `supabase/migrations/20261019174350_run_launch.sql` (private.launch_run), `src/lib/runs/assignees.ts` | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-RUN-09 | адміністратор без призначень — виконавець усіх 5 задач | `supabase/migrations/20261019174350_run_launch.sql` (private.launch_run), `src/lib/runs/assignees.ts` | `tests/db/run-launch-db.test.ts` | реалізовано |
| AC-TASK-01 | виконавець позначає свою задачу — «done» | `supabase/migrations/20261019174954_complete_task.sql` (private.complete_task), `src/app/runs/actions.ts` (completeTask) | `tests/db/run-progress-db.test.ts` | реалізовано |
| AC-TASK-02 | менеджер запуску позначає чужу задачу свого запуску — «done» | `supabase/migrations/20261019174954_complete_task.sql` (private.complete_task), `src/lib/runs/access.ts` (canCompleteTask) | `tests/db/run-progress-db.test.ts` | реалізовано |
| AC-TASK-03 | сторонній менеджер не позначає задачу — «to do» і повідомлення | `supabase/migrations/20261019174954_complete_task.sql` (private.complete_task), `src/lib/runs/messages.ts`, `src/app/runs/actions.ts` (completeTask) | `tests/db/run-progress-db.test.ts` | реалізовано |
| AC-TASK-04 | третя обов'язкова задача «done» — запуск «completed» | `supabase/migrations/20261019174954_complete_task.sql` (private.complete_task) | `tests/db/run-progress-db.test.ts` | реалізовано |
| AC-TASK-05 | прогрес «2 of 5 done» на сторінці запуску | `src/lib/runs/progress.ts` (formatProgress), `src/app/runs/[id]/page.tsx` | `tests/runs/progress.test.ts` | реалізовано |
| AC-TASK-06 | менеджер B бачить свій запуск і запуск, де він виконавець, але не інший запуск A | `supabase/migrations/20261019174350_run_launch.sql` (private.can_see_run, runs_select_visible), `src/app/runs/page.tsx` | `tests/db/run-visibility-db.test.ts` | реалізовано |
| AC-TASK-07 | адміністратор позначає задачу чужого запуску — «done» | `supabase/migrations/20261019174954_complete_task.sql` (private.complete_task), `src/lib/runs/access.ts` (canCompleteTask) | `tests/db/run-progress-db.test.ts` | реалізовано |
| AC-TASK-08 | на сторінці запуску статус кожної з 5 задач | `src/app/runs/[id]/page.tsx`, `src/lib/runs/labels.ts` | `tests/db/run-progress-db.test.ts` | реалізовано |
| AC-TASK-09 | прогрес «2 of 5 done» у списку запусків | `supabase/migrations/20261019183128_run_progress_view.sql` (run_progress), `src/app/runs/page.tsx` | `tests/db/run-visibility-db.test.ts` | реалізовано |
