# Design: зріз 3 — підрядник

## Контекст

Ролі зараз `manager` і `admin` (`profiles_role_check`, міграція `20261019174350_run_launch.sql`). Видимість запусків
рахує `private.can_see_run` (адміністратор, менеджер запуску або виконавець хоча б однієї задачі); політика
`run_tasks_select_visible` дає виконавцю **всі** задачі запуску. `launch_run` приймає виконавцями лише `manager` /
`admin`, `list_assignable_users` повертає лише їх, `complete_task` пускає лише `manager` / `admin`. Шаблони й версії
вже закриті для будь-якої ролі, крім `admin` і (поточна версія) `manager`. У застосунку `requireViewer()` знає лише
дві ролі й перенаправляє решту на `/`.

## Дані й RLS (одна нова міграція `…_vendor_role.sql`)

- **Роль** (AC-VENDOR-01…10): за порядком із заголовка `20261012000000_profiles_and_roles.sql` — зняти
  `profiles_role_check` → даних не змінюємо (нових значень немає) → `default` лишається `manager` → новий
  `profiles_role_check` з `('manager', 'admin', 'vendor')`. Роль підрядника задає адміністратор (у навчальному
  проєкті — `supabase/demo-users.json` і `npm run users:demo` з service_role), як і для інших ролей.
- **Лише свої задачі** (AC-VENDOR-04): `alter policy run_tasks_select_visible` — до `can_see_run(run_id)` додається
  умова «роль не `vendor` або `assignee_id = auth.uid()`». Підрядник не отримує рядків чужих задач ні сторінкою, ні
  прямим запитом. - **Рядок запуску без шаблону й версії** (AC-VENDOR-03, AC-VENDOR-06; матриця прав «See which template version a run
  follows» — «—» для `vendor`): `runs` містить назву шаблону й номер версії, а RLS не ховає колонок, тож
  `runs_select_visible` підрядника не пускає (`can_see_run` лишається в умові), а свої запуски він отримує функцією
  `public.vendor_runs(p_run_id)` (`security definer` у `private`): назва випадку, статус, час запуску, N і K його
  задач; лише запуски, де він виконавець, від новіших. Запуск без його задач — 0 рядків → «Run not found».
- **«Your tasks: N of K done»** (AC-VENDOR-03, 05): `vendor_runs()` рахує N і K лише з його задач; `run_progress`
  (`security_invoker`-view над `run_tasks`) для підрядника теж дає лише його задачі. Для менеджера й
  адміністратора — без змін («N of M done», AC-TASK-05, 09, 17).
- **Призначення підрядника** (AC-VENDOR-01): нова версія `private.launch_run` (копія з
  `20261025151836_template_versions.sql`) — перевірка виконавця `role in ('manager', 'admin', 'vendor')`; перевірка
  того, хто запускає, лишається `('manager', 'admin')` — підрядник не запускає шаблон і не стає менеджером запуску
  (AC-VENDOR-09: `LAUNCH_NOT_ALLOWED`, запуску немає).
- **Вибір виконавця** (AC-VENDOR-02): `private.list_assignable_users` — для `manager` / `admin` повертає й підрядників
  (лише `id`, `email`); підряднику — 0 рядків (він не бачить email інших, AC-VENDOR-04).
- **Позначка** (AC-VENDOR-05, 07): `private.complete_task` — роль `vendor` допущено, але для нього окрема перевірка
  перед загальною: лише задача, де він виконавець (`assignee_id = auth.uid()`), незалежно від `run_manager_id`. Так
  користувач, якого адміністратор перевів із `manager` у `vendor`, не позначає задач своїх колишніх запусків; чужа задача
  лишається «to do» (`NOT_ALLOWED`).
- **Підтвердження останньої обов'язкової задачі** (припущення PM у #39): клієнт рахує `isLastRequiredTask` з видимих
  задач, а підрядник бачить лише свої. Нова функція `public.run_last_required_task(p_run_id)` (`security definer` у
  `private`, обгортка `security invoker`) повертає id останньої обов'язкової задачі «to do», лише якщо запуск видно
  викликачу, а для підрядника — лише коли ця задача його; сторінка підрядника вмикає `ConfirmDialog` для неї. Сервер
  і так вимагає підтвердження (`CONFIRMATION_REQUIRED`).
- Функції — `security definer` лише в `private`, `set search_path = ''`, обгортки в `public`; роль — з
  `profiles.role` (`private.current_app_role()`), ніколи з `user_metadata`.

## UI

- **Роль у застосунку**: `AppRole = "manager" | "admin" | "vendor"` (`src/lib/supabase/viewer.ts`); хелпер
  `isVendor(role)`.
- **Список запусків підрядника** (AC-VENDOR-03, 10): `/runs` для `vendor` — окремий компонент `VendorRunsList`:
  назва випадку (посилання на запуск), статус запуску (`StatusBadge`) і «Your tasks: N of K done»; без менеджера,
  назви шаблону, наступної задачі й email виконавців (Q11 — лише поля, названі PM); порядок — від новіших. Порожній
  стан — `EmptyState` «No tasks assigned to you yet.» без таблиці й без «Launch a template». Головна `/` для
  підрядника веде на `/runs` (лічильники головної рахують запуски агенції).
- **Сторінка запуску підрядника** (AC-VENDOR-04, 05): той самий маршрут `/runs/[id]`, компонент `VendorRunDetail`:
  назва випадку, статус запуску, «Your tasks: N of K done», задачі групами за секціями (лише свої) — назва,
  «required» / «optional», статус, «Mark as done»; без email, панелі «Details», прогресу всього запуску, шаблону й
  версії. Запуск без його задач — `notFound()` → «Run not found» (AC-VENDOR-06).
- **Шаблони** (AC-VENDOR-08, Q12): `/templates`, `/templates/[id]`, `/templates/[id]/launch`, `/templates/new`,
  редактор і версії для `vendor` — `Forbidden` з «Not enough rights» і посиланням «Back to runs» (не «Back to
  templates», бо там та сама відмова); даних шаблонів сторінка не читає.
- **Навігація**: для `vendor` у бічній панелі й ⌘K — лише Runs (без Home, Templates і «Launch a template»).
- **Повідомлення**: `NO_VENDOR_TASKS = "No tasks assigned to you yet."`, `formatVendorProgress` → «Your tasks: N of K
  done» (`src/lib/runs/labels.ts`, `progress.ts`); `INVALID_ASSIGNEE` → «An assignee must be a manager, an
  administrator or a vendor».

## Тести (AC ID у назвах)

- База (PGlite, `tests/db/vendor-db.test.ts`): AC-VENDOR-01 (призначення й виконавці 1, 2, 5 — менеджер),
  AC-VENDOR-02 (email підрядника у виборі; ключі лише `id`, `email`), AC-VENDOR-04 (підрядник читає лише задачі 3 і
  4 напряму), AC-VENDOR-05 (позначка своєї задачі, «1 of 2»), AC-VENDOR-06 (чужий запуск — 0 рядків), AC-VENDOR-07
  (чужа задача — `NOT_ALLOWED`, «to do»), AC-VENDOR-09 (`LAUNCH_NOT_ALLOWED`, кількість запусків не змінилась);
  шаблони для підрядника — 0 рядків.
- Застосунок: `VendorRunsList` (AC-VENDOR-03, 10 — дослівні тексти, без таблиці), сторінка `/templates` для
  підрядника (AC-VENDOR-08 — «Not enough rights», жодного запиту до шаблонів), `formatVendorProgress`.
- Наявні тести політик (`tests/db/run-visibility-db.test.ts`) лишаються: назви політик ті самі, `can_see_run` у
  `qual`.
