# Design: уточнення зрізу 3 — підрядник

## Контекст

`private.complete_task` (остання версія — `20261030125515_vendor_role.sql`) відхиляє будь-яку позначку в запуску не
«in progress» (`RUN_COMPLETED`), а підряднику на чужу задачу — `NOT_ALLOWED` з кодом без тексту. Сторінка запуску
підрядника (`VendorRunPage`) показує статус запуску в `actions` шапки. Навігація підрядника (`navFor`) — лише «Runs».
Сторінки шаблонів для підрядника вже показують `Forbidden` з «Back to runs» (`src/app/_components/forbidden.tsx`).
RLS `run_tasks`, `profiles` і `runs` уже не віддають підряднику чужого.

## Дані й RLS (одна нова міграція `…_vendor_clarify.sql`)

- **Нова версія `private.complete_task`** (`create or replace`, копія з `20261030125515_vendor_role.sql`, решта логіки
  без змін — підтвердження останньої обов'язкової, повтор на «done», завершення запуску):
  - **AC-VENDOR-15:** підрядник і в запуску немає жодної його задачі → `raise exception 'RUN_NOT_FOUND' using detail =
    'Run not found'`; задача лишається «to do». Перевірка — до перевірки «чужа задача».
  - **AC-VENDOR-07, AC-TASK-03:** відмова в праві — `raise exception 'NOT_ALLOWED' using detail = 'Only the task''s assignee,
    the run manager, or an administrator can mark a task as done'`: прямий запит отримує текст PM у `details`, а код
    `NOT_ALLOWED` у `message` лишається для застосунку (`dbErrorCode`, `MESSAGES`).
  - **AC-VENDOR-16, AC-TASK-19:** у запуску «completed» можна позначити **необов'язкову** задачу «to do»: статус задачі
    «done», `done_by`, `done_at`; запуск лишається «completed», `completed_at` не змінюється. `RUN_COMPLETED` — лише для
    обов'язкової задачі в незавершеному стані, якого в завершеному запуску не буває (захист від гонки).
- **AC-VENDOR-17, AC-VENDOR-18:** без змін схеми — політики `run_tasks_select_visible` (лише свої задачі підрядника),
  `profiles` (лише свій рядок), `runs_select_visible` (підрядника не пускає), `list_assignable_users` (0 рядків
  підряднику). Доводять тести бази з AC ID.

## UI

- **AC-VENDOR-11:** `VendorRunPage` — заголовок `PageShell` — назва випадку, під ним «Your tasks: N of K done»
  (`VendorRunDetail`); прибрати `StatusBadge` статусу запуску з `actions`; назви й версії шаблону вже немає.
- **AC-VENDOR-12:** `VendorRunsList` — назва випадку, статус, «Your tasks: N of K done», без назви шаблону (вже так);
  тест з AC ID.
- **AC-VENDOR-13:** `navFor("vendor")` — «Runs» і «Profile»; новий маршрут `/profile` (група `(app)`, `requireViewer()`):
  власний email і роль — матриця прав «See own profile» (yes для всіх ролей); у ⌘K — «Go to Runs» і «Go to Profile».
  Перша сторінка підрядника — `/runs` (головна вже перенаправляє підрядника). Для менеджера й адміністратора навігація
  без змін.
- **AC-VENDOR-14:** форма запуску, сторінка шаблону, список версій і редактор — `Forbidden` з «Back to runs» для
  підрядника (вже так, `requireViewer` → `isVendor` до запитів даних); тести з AC ID на кожну сторінку.
- **AC-VENDOR-16, AC-TASK-19 (сторінка):** `canCompleteTask` (`src/lib/runs/access.ts`) зараз не пропонує позначку в
  запуску не «in progress»; дозволяємо й необов'язкову задачу «to do» запуску «completed» — та сама умова, що в базі.
- **AC-VENDOR-07 (сторінка):** `completeTask` уже показує `MESSAGES.NOT_ALLOWED`; `RUN_NOT_FOUND` → «Run not found» у
  `src/lib/runs/messages.ts`.

## Тести (AC ID у назвах)

- База (PGlite): AC-VENDOR-07 (`NOT_ALLOWED`, текст PM у деталях помилки, задача «to do»), AC-VENDOR-15
  (`RUN_NOT_FOUND`, «Run not found», задача «to do»), AC-VENDOR-16 і AC-TASK-19 (необов'язкова задача завершеного запуску
  «done», запуск «completed», прогрес), AC-VENDOR-17 (прямий select — лише задачі 3 і 4), AC-VENDOR-18 (`profiles`,
  `list_assignable_users`, `runs` і `run_tasks` чужого запуску — нічого).
- Застосунок: AC-VENDOR-11 (сторінка без статусу запуску й шаблону), AC-VENDOR-12 (рядок без назви шаблону),
  AC-VENDOR-13 (`navFor`, `navigationCommands`, сторінка профілю), AC-VENDOR-14 (чотири сторінки — «Not enough rights» і
  «Back to runs», жодного запиту до даних шаблону).
- SQL-мутанти (`scripts/mutants.mjs`): перевірка `RUN_NOT_FOUND` і дозвіл лише необов'язкової задачі в «completed».
- UAT (`tests/e2e/vendor.spec.ts`): по тесту на AC-VENDOR-07 (новий «Тоді»), 08, 11…18 і AC-TASK-19.
