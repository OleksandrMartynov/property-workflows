# Design: impl-clarify-template-runs

## Контекст

Продовження `impl-template-runs` (рішення D1–D10 там лишаються чинними; ADR `docs/decisions/0001`, `0002`). Правила
бази — `AGENTS.md`, «База даних»: застосовані міграції не редагуємо, зміну функції бази робимо новою міграцією з
`create or replace` (або `drop` + `create`, якщо змінюється сигнатура) і повторними `revoke` / `grant`.

## Рішення

### D11. Призначення для задачі, якої вже немає в шаблоні (AC-RUN-04; рішення PM #9)

Нова міграція замінює `private.launch_run`: ключ `p_assignees`, що не є задачею цього шаблону, більше не дає помилку
`INVALID_TASK`, а відкидається — PM: «an assignment made for it is dropped, so the launch must not fail because of it».
Перевірка виконавця (лише `manager` / `admin`) лишається для задач шаблону. Задача, додана в шаблон після відкриття форми,
отримує виконавцем менеджера запуску — так уже працює `coalesce(…, v_uid)`. Сигнатура не змінюється.

### D12. «Run not found» (AC-TASK-10)

`src/app/runs/[id]/page.tsx` для запуску, якого RLS не віддає (чужого або неіснуючого), викликає `notFound()`, а
`src/app/runs/[id]/not-found.tsx` показує текст PM «Run not found» (`MESSAGES.RUN_NOT_FOUND`) і посилання на список
запусків — без жодної задачі. Next.js повертає 404. Окремого запиту задач для чужого запуску немає: RLS `run_tasks`
його й так не віддає.

### D13. Підтвердження останньої обов'язкової задачі (AC-TASK-04, AC-TASK-16)

- База: `complete_task(p_task_id uuid, p_confirmed boolean default false)` — нова міграція (`drop function` +
  `create`, бо змінюється сигнатура; `revoke` / `grant` заново). Якщо задача обов'язкова й решта обов'язкових задач
  запуску вже «done» (тобто вона остання), а `p_confirmed` не `true`, функція кидає `CONFIRMATION_REQUIRED` і нічого не
  змінює. Так «done лише після підтвердження» тримає база, а не лише інтерфейс.
- Інтерфейс: `src/lib/runs/confirmation.ts` — `isLastRequiredTask(task, tasks)` і `confirmationText(taskName)` (назва
  задачі й «This cannot be undone»). На сторінці запуску кнопку останньої обов'язкової задачі рендерить клієнтський
  `MarkDoneButton`: `window.confirm(confirmationText(…))`; «Cancel» — форма не надсилається, задача лишається «to do»
  (AC-TASK-16); «OK» — приховане поле `confirmed=yes`, дія `completeTask` передає `p_confirmed: true` (AC-TASK-04).
  Решта задач — без підтвердження, як і раніше.

### D14. Сторінка запуску (AC-TASK-11, AC-TASK-12, AC-TASK-15, AC-TASK-18, AC-RUN-10)

- Групи за секціями — `groupBySection(tasks)` у `src/lib/runs/sections.ts` (порядок `section_position`, у секції —
  `position`); сторінка бере групи звідти, а не з `Set` назв.
- Позначка — `requiredLabel(required)` у `src/lib/runs/labels.ts` («required» / «optional»).
- Email — як і раніше, з `list_assignable_users` (лише `id` і `email`, D5); тести — на рівні бази для менеджера A
  (вибір виконавця) і менеджера B (біля задач).
- Можливість позначки — `canCompleteTask` (D6 попереднього плану); тест AC-TASK-18 — менеджер C на своїй і чужій задачі.

### D15. Список запусків (AC-TASK-13, AC-TASK-14, AC-TASK-17)

Код сторінки `/runs` не змінюється: запит `runs` з `order by created_at desc`, прогрес — view `run_progress`, рядок —
назва випадку, назва шаблону, статус і прогрес. Тести на базі (PGlite): завершений запуск із «4 of 5 done» (AC-TASK-13),
порядок і назви з тестовим шаблоном «Repair» (AC-TASK-14), прогрес для виконавця B (AC-TASK-17).

### D16. Назва випадку й секції (AC-RUN-11, AC-RUN-12)

Код уже обрізає пробіли (`validateCaseName`, `launch_run`) і копіює секції в `run_tasks` (D3). Тести: юніт і база для
назви «пробіл + 100 символів»; база — перейменування секції й перенесення задачі в шаблоні після запуску.
