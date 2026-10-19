# Design: impl-template-runs

## Контекст

Стек фіксований (Next.js 16 App Router, Supabase Postgres + Auth + RLS). Правила бази — `AGENTS.md`, «База даних»:
RLS на кожній таблиці, `revoke all` + явні `grant`, політика на кожну операцію `to authenticated` з
`(select auth.uid())`, `security definer` лише в схемі `private` з `set search_path = ''`, кілька записів — однією
функцією Postgres через `supabase.rpc(…)`. Відкриті питання до PM (Q1–Q4, `docs/spec-reading.md`) реалізуємо за
робочими припущеннями з `## Assumptions` специфікації й позначаємо в PR.

## Рішення

### D1. Ролі `manager` / `admin` (усі AC)

Нова міграція замінює ролі шаблону `member` / `admin` на ролі з матриці прав `requirements/product.md`: зняти
`profiles_role_check` → `update … set role = 'manager' where role = 'member'` → `default 'manager'` → новий
`profiles_role_check in ('manager', 'admin')`. `supabase/demo-users.json`: `admin@example.test` (admin) і три
менеджери `manager.a@`, `manager.b@`, `manager.c@example.test` — менеджери A, B і C з AC.

### D2. Шаблони — довідкові дані без екрана (AC-RUN-01, AC-RUN-02)

Таблиці `templates` (назва), `template_sections` (шаблон, назва, `position`), `template_tasks` (секція, назва,
`required`, `position`). Бачать усі `manager` і `admin` (select); змінює лише `admin` (insert / update / delete —
політики з `private.current_app_role() = 'admin'`). Екрана редагування немає (Non-goals): шаблон «Tenant move-in»
(2 секції, 5 задач, 3 обов'язкові) і «Apartment repair» додає міграція (`insert … on conflict do nothing`).

### D3. Запуск зберігає копію задач (AC-RUN-01, AC-RUN-02)

`runs`: `template_id`, `template_name` (копія), `case_name`, `run_manager_id`, `status` (`in_progress` /
`completed`), `created_at`, `completed_at`. `run_tasks`: `run_id`, `section_name`, `section_position`, `position`,
`name`, `required` (усе — копія з шаблону на момент запуску), `assignee_id`, `status` (`to_do` / `done`), `done_at`,
`done_by`. Зміна шаблону після запуску не зачіпає `run_tasks` (AC-RUN-02). Альтернатива — посилання на
`template_tasks` з версіями — складніша й не потрібна зрізу (ADR 0001).

### D4. Функція запуску `launch_run` (AC-RUN-01, AC-RUN-03…09)

`public.launch_run(p_template_id, p_case_name, p_assignees jsonb)` — `security invoker` обгортка над
`private.launch_run` (`security definer`, `search_path = ''`), бо `runs` і `run_tasks` не мають grant на insert для
клієнта: запуск і копія задач — лише однією транзакцією. Функція:

- обрізає пробіли на краях назви; порожня → `CASE_NAME_REQUIRED` (AC-RUN-03), > 100 символів →
  `CASE_NAME_TOO_LONG` (AC-RUN-07); робоче припущення Q3;
- перевіряє роль викликача (`manager` / `admin`) і робить його `run_manager_id` (AC-RUN-05, AC-RUN-06);
- копіює всі задачі шаблону зі статусом `to_do`, запуск — `in_progress` (AC-RUN-01);
- `p_assignees` — `{ "<template_task_id>": "<user_id>" }`; виконавець — лише `manager` / `admin`
  (`INVALID_ASSIGNEE`), незгадані задачі — на менеджері запуску (AC-RUN-04, AC-RUN-08, AC-RUN-09).

Ті самі перевірки назви — у доменній функції `validateCaseName` (`src/lib/runs/case-name.ts`) до виклику бази; тексти
повідомлень PM — у `src/lib/runs/messages.ts`.

### D5. Вибір виконавця (AC-RUN-04; Q1)

`private.list_assignable_users()` через `public.list_assignable_users()` повертає `id` і `email` усіх `manager` /
`admin` — без інших полів профілю (робоче припущення Q1). RLS `profiles` не змінюємо.

### D6. Позначка задачі `complete_task` (AC-TASK-01…04, AC-TASK-07; Q2)

`run_tasks` не має grant на update для клієнта. `public.complete_task(p_task_id)` → `private.complete_task`
(`security definer`) з `for update` на рядку задачі:

- дозволено виконавцю, менеджеру запуску й `admin` (AC-TASK-01, AC-TASK-02, AC-TASK-07), іншим →
  `NOT_ALLOWED` → повідомлення AC-TASK-03, задача лишається `to_do`;
- уже `done` — нічого не змінює (припущення PM);
- лише в запуску `in_progress` (специфікація «Позначка задачі виконаною»); у `completed` → `RUN_COMPLETED`
  (PM-Q1 свідомо не специфікує; тести цього не перевіряють);
- коли всі обов'язкові задачі `done` — `runs.status = 'completed'` (AC-TASK-04).

Та сама перевірка прав — у доменній функції `canCompleteTask` (`src/lib/runs/access.ts`): кнопку «Mark as done»
показуємо лише тим, кому дозволено.

### D7. Видимість (AC-TASK-06; Q2)

Політика select `runs` і `run_tasks`: `admin`, менеджер запуску або виконавець хоча б однієї задачі запуску —
через `private.can_see_run(run_id)` (`security definer`, без рекурсії політик). Чужий запуск за адресою — 404
(`notFound()`), робоче припущення Q2.

### D8. Прогрес (AC-TASK-05, AC-TASK-08, AC-TASK-09; Q4)

`formatProgress(done, total)` → `"N of M done"` (`src/lib/runs/progress.ts`), M — усі задачі запуску. Сторінка
`/runs/[id]` — прогрес і статус кожної задачі за секціями; список `/runs` — кожен видимий запуск із прогресом
(робоче припущення Q4: прогрес бачить кожен, кому видно запуск).

### D9. Сторінки й дії

- `/` — посилання «Templates», «Runs».
- `/templates` — шаблони з кількістю задач; `/templates/[id]/launch` — назва випадку й вибір виконавця на кожну
  задачу (за замовчуванням «me — run manager»); дія `launchRun` → `/runs/[id]`.
- `/runs` — список (D7, D8); `/runs/[id]` — сторінка запуску; дія `completeTask`.
- Помилки — `?error=<CODE>` → текст PM з `messages.ts` (як у демо курсу).

### D10. Тести

- Доменні функції — Vitest (`tests/runs/*.test.ts`).
- Правила бази (RLS, функції) — справжній Postgres у WASM (PGlite) з усіма міграціями, без Docker:
  `tests/db/supabase-pglite.ts` взято з демо курсу
  (https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/blob/main/tests/db/supabase-pglite.ts), нова
  devDependency `@electric-sql/pglite` (ADR 0002). Назва кожного тесту поведінки починається з AC ID.

## Ризики

- Міграції в кожній задачі — новим файлом; дві гілки з міграціями не ведемо паралельно (`db-check` «OLDER»).
- База одна для проду й preview: дані лише синтетичні (`*@example.test`).
