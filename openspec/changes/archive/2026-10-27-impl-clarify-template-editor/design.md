# Design: уточнення зрізу 2

## Контекст

Зріз 2 уже реалізовано планом `impl-template-editor` (ADR 0006: незбережені зміни в робочих таблицях, незмінні
версії в `template_versions`). Відповіді PM від 2026-10-27 додали 24 AC. Частину з них поточний код уже виконує
(AC-EDITOR-03, 11, 12, 15, 26, 27, 29 — потрібні лише тести з правильними AC ID); решта — нові сторінки, правила
назв, місце стану змін у редакторі, вибір теми й повернення після входу.

## UI і компоненти

- **Сторінка шаблону для менеджера** `/templates/[id]` (AC-EDITOR-02): лише читання — назва, «Version N», секції з
  задачами й позначкою «required» / «optional», посилання «Launch»; лише поточна версія. Картка менеджера в галереї
  веде сюди. Компоненти: `Card`, `Badge`, `buttonVariants` (`@/components/ui`).
- **«Template not found»** (AC-EDITOR-16): `templates/[id]/not-found.tsx` з `EmptyState`, як `runs/[id]/not-found.tsx`;
  ним же відповідає форма запуску для шаблону без версії.
- **Недоступний шаблон** (AC-EDITOR-10): у формі запуску й на картці адміністратора — вимкнений «Launch» і примітка
  «Save the template to launch it»; обрати його не можна.
- **Порожні стани** (AC-EDITOR-17, 18): менеджер — «No templates yet. An administrator creates them.»; адміністратор
  (припущення PM у `requirements/20-edit-a-template-with-version-control.md`, рішення
  https://github.com/solomchaak/property-workflows-spec/issues/27) — «No templates yet. Create a template to start.» і
  «Create a template»; список версій —
  «No versions yet. Save the template to create version 1.». Без порожніх таблиць (`EmptyState`).
- **Підтвердження видалення** (AC-EDITOR-13, 14): `ConfirmDialog` з `tone="destructive"` — назва секції чи задачі й
  «This cannot be undone»; «Cancel» нічого не змінює.
- **Місце стану змін** (AC-EDITOR-25): одне фіксоване місце в редакторі (`role="status"`) — «All changes kept», під
  час дії — «Saving…», після збою — «Your last change was not kept. Try again.» кольором `destructive`; введений текст
  лишається на екрані. Дії викликаються з клієнта в `try/catch`, мережева помилка не веде на `error.tsx`.
- **Повідомлення про назви** (AC-EDITOR-19, 20, 23, 24): «Enter a template name», «Every section and task needs a
  name», «A template with this name already exists» — у `src/lib/runs/messages.ts`, дослівно з AC.
- **Тема** (AC-DSYS-05, 06): вибір «Theme» — «System» / «Light» / «Dark» (`Segmented`) у вікні акаунта й на сторінці
  входу; зберігається на пристрої (`localStorage`), застосовується до всіх сторінок до першого кадру (атрибут
  `data-theme` на `<html>`). AC-DSYS-07: статусні пари темної теми ≥ 4.5:1 — тест контрасту.
- **Повернення після входу** (AC-DSYS-08): proxy і `requireViewer()` передають `?next=<шлях>`; форма входу несе його
  прихованим полем; після входу — перехід на безпечний `next` (лише відносний шлях свого сайту).

## Дані й RLS

- Нових таблиць немає. Видимість версій і незбережених змін — як в ADR 0006: менеджер читає лише поточну версію
  (`template_versions_select`), робочі таблиці й `list_template_drafts` — лише `admin` (AC-EDITOR-29).
- **Назви** (AC-EDITOR-23, 24): нова міграція — унікальний індекс на `lower(btrim(name))` шаблону замість простого
  `unique`; перевірка зайнятої назви при створенні й у `private.save_template_version` для перейменованого шаблону;
  окремі коди помилок, а не загальний `DB_ERROR`. Порожня назва секції чи задачі (AC-EDITOR-20) може бути в
  незбережених змінах, але `save_template_version` відмовляє з кодом, що відповідає «Every section and task needs a
  name»; check-обмеження версій і запусків не послаблюємо.
- **Кілька відмов одразу** (Q9 зміни специфікації): `save_template_version` перевіряє по черзі й зупиняється на першій — порожня назва шаблону, порожні назви секцій і задач (AC-EDITOR-20), зайнята назва (AC-EDITOR-24), немає обов'язкової задачі (AC-EDITOR-04), секція без задач (AC-EDITOR-15); раніше за всі — відсутність незбережених змін (AC-EDITOR-12); користувач бачить одне повідомлення, усі зміни лишаються.
- Відмова без версії (AC-EDITOR-11) і без змін (AC-EDITOR-12) — у `launch_run` і `save_template_version` (вже є).
- Функції — `security definer` лише в `private`, `set search_path = ''`, обгортки в `public` з перевіркою ролі з
  `profiles.role` усередині; `grant execute` лише `authenticated`.

## Auth

- Кожна Server Action редактора починається з `requireAdmin()` (`getClaims()` + роль з `profiles`), правило
  «Кожна Server Action перевіряє вхід» в `architecture.yml` (AC-EDITOR-26).
- Proxy — лише UX (редірект на `/login?next=…`); дані захищає RLS і перевірка в дії. `safeNext()` — захист від
  відкритого редіректу (AC-DSYS-08); вхід — виняток правила (сесії ще немає).
- Admin-клієнт не потрібен: усі записи — від імені користувача через RLS і функції бази.
