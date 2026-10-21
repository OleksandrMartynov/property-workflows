# Design: impl-template-runs

## Контекст

Стек фіксований (Next.js 16 App Router, Supabase Postgres + Auth + RLS). Правила бази — `AGENTS.md`, «База даних»:
RLS на кожній таблиці, `revoke all` + явні `grant`, політика на кожну операцію `to authenticated` з
`(select auth.uid())`, `security definer` лише в схемі `private` з `set search_path = ''`, кілька записів — однією
функцією Postgres через `supabase.rpc(…)`. Відкриті питання до PM (Q1–Q4, `docs/spec-reading.md`) реалізуємо за
робочими припущеннями з `## Assumptions` специфікації й позначаємо в PR.

## Рішення

### D1. Ролі `manager` / `admin` (AC-RUN-04, AC-RUN-05, AC-RUN-06, AC-RUN-08, AC-RUN-09, AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-06, AC-TASK-07)

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
(робоче припущення Q4: прогрес бачить кожен, кому видно запуск). Після рев'ю CodeRabbit (PR #8): у списку done і total
рахує база — view `run_progress` (`security_invoker`, RLS від `run_tasks`), список — сторінками по 50.

### D9. Сторінки й дії (AC-RUN-01…AC-RUN-09, AC-TASK-01…AC-TASK-09)

- `/` — посилання «Templates», «Runs».
- `/templates` — шаблони з кількістю задач; `/templates/[id]/launch` — назва випадку й вибір виконавця на кожну
  задачу (за замовчуванням «me — run manager»); дія `launchRun` → `/runs/[id]` (AC-RUN-01, AC-RUN-03, AC-RUN-04,
  AC-RUN-05, AC-RUN-06, AC-RUN-07, AC-RUN-08, AC-RUN-09).
- `/runs` — список (D7, D8; AC-TASK-06, AC-TASK-09); `/runs/[id]` — сторінка запуску (AC-RUN-02, AC-TASK-05,
  AC-TASK-08); дія `completeTask` (AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-04, AC-TASK-07).
- Помилки — `?error=<CODE>` → текст PM з `messages.ts` (як у демо курсу): «Enter a case name» (AC-RUN-03), «Case name
  must be at most 100 characters» (AC-RUN-07), повідомлення про заборону позначки (AC-TASK-03).
- Трасування AC після уточнень PM: AC-RUN-10…AC-RUN-12 і AC-TASK-10…AC-TASK-18 з’явились у знімку 2026-10-21, тож
  у цьому плані їх немає. Їх описують рішення D11–D16 плану `impl-clarify-template-runs`
  (`openspec/changes/archive/2026-10-21-impl-clarify-template-runs/design.md`):
  D11 — AC-RUN-04 (призначення для прибраної задачі), D12 — AC-TASK-10, D13 — AC-TASK-04 і AC-TASK-16,
  D14 — AC-RUN-10, AC-TASK-11, AC-TASK-12, AC-TASK-15, AC-TASK-18, D15 — AC-TASK-13, AC-TASK-14, AC-TASK-17,
  D16 — AC-RUN-11 і AC-RUN-12.

### D10. Тести (AC-RUN-01…AC-RUN-09, AC-TASK-01…AC-TASK-09)

- Доменні функції — Vitest (`tests/runs/*.test.ts`): назва випадку (AC-RUN-03, AC-RUN-07), виконавці з форми
  (AC-RUN-04, AC-RUN-08, AC-RUN-09), хто бачить кнопку позначки (AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-07), прогрес
  «N of M done» і статуси задач (AC-TASK-05, AC-TASK-08).
- Правила бази (RLS, функції) — справжній Postgres у WASM (PGlite) з усіма міграціями, без Docker (AC-RUN-01,
  AC-RUN-02, AC-RUN-03, AC-RUN-04, AC-RUN-05, AC-RUN-06, AC-RUN-07, AC-RUN-08, AC-RUN-09, AC-TASK-01…AC-TASK-09):
  `tests/db/supabase-pglite.ts` взято з демо курсу
  (https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/blob/main/tests/db/supabase-pglite.ts), нова
  devDependency `@electric-sql/pglite` (ADR 0002). Назва кожного тесту поведінки починається з AC ID.
- Тести AC-RUN-10…AC-RUN-12 та AC-TASK-10…AC-TASK-18 — у плані `impl-clarify-template-runs`, за тими самими
  рішеннями: D11 — AC-RUN-04 (призначення для прибраної задачі), D12 — AC-TASK-10, D13 — AC-TASK-04 і AC-TASK-16,
  D14 — AC-RUN-10, AC-TASK-11, AC-TASK-12, AC-TASK-15, AC-TASK-18, D15 — AC-TASK-13, AC-TASK-14, AC-TASK-17,
  D16 — AC-RUN-11 і AC-RUN-12 (секції запуску після змін шаблону — тест бази на шаблоні 2 + 3).

## Ризики

- Міграції в кожній задачі — новим файлом; дві гілки з міграціями не ведемо паралельно (`db-check` «OLDER»).
- База одна для проду й preview: дані лише синтетичні (`*@example.test`).
