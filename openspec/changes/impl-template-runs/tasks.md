# Tasks

Вертикальні задачі: кожна — таблиця/RLS + доменна функція + server action/сторінка + тест. Одна задача — одна гілка
`task/<коротко>` і один PR «Реалізація». Перевірка — `npm test`, `npm run ac:coverage`.

## 1. Запуск шаблону

- [ ] 1.1 Міграція: ролі `manager`/`admin` (дані → default → constraint), `demo-users.json` (admin, manager.a/b/c);
  таблиці `templates`, `template_sections`, `template_tasks`, `runs`, `run_tasks` з RLS і GRANT; `private.can_see_run`;
  функції `launch_run` і `list_assignable_users`; шаблони «Tenant move-in» і «Apartment repair»; `database.types.ts`.
  Тестова база PGlite (ADR 0002), ADR 0001 (копія задач).
  Done when: AC-RUN-01, AC-RUN-02, AC-RUN-04, AC-RUN-05, AC-RUN-06, AC-RUN-08, AC-RUN-09 — тести бази зелені.
- [ ] 1.2 `validateCaseName` і тексти PM; сторінки `/templates`, `/templates/[id]/launch`, дія `launchRun`; сторінка
  `/runs/[id]` з задачами й виконавцями.
  Done when: AC-RUN-03, AC-RUN-07 — «Enter a case name» і «Case name must be at most 100 characters», запуску немає.

## 2. Позначка задач і прогрес запуску

- [ ] 2.1 Міграція: функція `complete_task` (права, повторна позначка, завершення запуску).
  Done when: AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-04, AC-TASK-07 — тести бази зелені.
- [ ] 2.2 `canCompleteTask`, `formatProgress`; на `/runs/[id]` — прогрес, статус кожної задачі, кнопка
  «Mark as done» і дія `completeTask` з повідомленням AC-TASK-03.
  Done when: AC-TASK-05, AC-TASK-08 — «2 of 5 done» і статус кожної з 5 задач.

## 3. Список запусків

- [ ] 3.1 Сторінка `/runs`: видимі запуски з прогресом; тест видимості на базі.
  Done when: AC-TASK-06, AC-TASK-09 — менеджер B бачить 2 запуски, запуск показано з «2 of 5 done».
