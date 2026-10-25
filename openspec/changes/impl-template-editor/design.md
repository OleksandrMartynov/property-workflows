# Design: impl-template-editor

## Контекст

Стек і правила бази — `AGENTS.md`; дизайн-система — `DESIGN.md` і `src/components/ui` (PR #18). Шаблони зрізу 1
(`templates`, `template_sections`, `template_tasks`) редагує лише `admin`, а `launch_run` копіює задачі прямо з них
(ADR 0001, ADR 0003). Зріз 2 розділяє шаблон на дві речі з глосарію PM: **незбережені зміни** (Unpublished changes) і
**версії** (Version, Current version). Відкриті питання до PM (QA–QD у `docs/spec-reading.md`, «Зріз 2»; колег #21,
#22) реалізуємо за робочими припущеннями й позначаємо в PR.

## UI і компоненти

Лише компоненти з `@/components/ui` і токени з `DESIGN.md`; тексти — дослівно з AC.

- **`/templates`** — `Table`. Адміністратор бачить усі шаблони, у шаблону з незбереженими змінами — `StatusBadge`
  «Unpublished changes» (теплий жовтий `due-soon`, зі словом), дії «Edit» і «Versions», кнопка «New template»
  (AC-EDITOR-01, AC-EDITOR-04). Менеджер бачить лише шаблони з поточною версією, назву й кількість задач цієї версії,
  без позначки й без «Edit» / «Versions» (AC-EDITOR-02).
- **`/templates/new`** (admin) — `Field` + `Input` назви, `Button` «Create»; створює шаблон без версії.
- **`/templates/[id]/edit`** — редактор (admin): секції як `Card`, у кожній задачі з `Input` назви, `Checkbox`
  «Required», кнопками переміщення вгору / вниз і `Select` «Move to section» (робоче припущення QB), «Remove»;
  «Add section», «Add task». Кожна дія — окрема форма з Server Action, тож зміна зберігається одразу (AC-EDITOR-01);
  угорі — `StatusBadge` «Unpublished changes», `Button` «Save» (основна дія). Помилка збереження — `Alert` з
  «A template needs at least one required task» (AC-EDITOR-04); успіх — «Version N saved» («Вигляд і тон»).
- **`/templates/[id]/versions`** — `Table`: «Version N», дата й час `DD.MM.YYYY HH:MM` (Kyiv), email автора; від новішої
  (AC-EDITOR-05). Версія 1 шаблонів зрізу 1 без автора — «Initial data» (робоче припущення).
- **Відмова в правах** — спільний компонент сторінки `Forbidden`: `Alert` «Not enough rights» і посилання
  «Back to templates» усередині того самого `AppShell`, без вмісту редактора чи версій (AC-EDITOR-07, AC-DSYS-02).
- **Сторінка запуску** — рядок «Template version N» під назвою шаблону (AC-EDITOR-06); статус запуску —
  `StatusBadge` «in progress» (синій `progress`) чи «completed» (зелений `done`), слово поруч з іконкою й кольором —
  той самий компонент у списку й на сторінці (AC-DSYS-01).
- **Список запусків без жодного запуску** — `EmptyState` «No runs yet. Launch a template to start one.» з посиланням
  «Launch a template», без таблиці (AC-DSYS-04).
- **Без входу** — `src/proxy.ts` перенаправляє будь-яку сторінку, крім `/login` і `/auth`, на `/login` у тому
  самому макеті входу (AC-EDITOR-09, AC-DSYS-03). Це лише UX: дані захищають RLS і перевірка в кожній дії (нижче).

## Дані й RLS

Нова міграція `template_versions`; застосованих міграцій не змінюємо.

- **`template_versions`** (`id`, `template_id`, `number`, `name`, `saved_at`, `saved_by` → `profiles`, `null` —
  «Initial data»; `unique (template_id, number)`) і **`template_version_tasks`** (`version_id`, `template_task_id`,
  `section_name`, `section_position`, `position`, `name`, `required`) — незмінний знімок (AC-EDITOR-03, AC-EDITOR-06).
  `enable row level security`, `revoke all … from anon, authenticated`, `grant select` лише `authenticated`; insert —
  лише функція збереження; **update і delete не дає ніхто** — збережена версія ніколи не змінюється (припущення PM).
  - `template_versions_select`: `admin` — усі версії (AC-EDITOR-05); `manager` — лише поточна версія шаблону
    (AC-EDITOR-02, AC-EDITOR-07).
  - `template_version_tasks_select`: та сама умова через версію.
- **`templates`**: нові колонки `current_version` (номер, `null` — ще не збережено) і `has_unpublished_changes`
  (`boolean`). Обидві ставить лише функція збереження й тригери: **column grant** `update (name)` для
  `authenticated` замість update на весь рядок — адміністратор змінює назву, а не номер версії чи позначку.
  Політики:
  - `templates_select`: `admin` — усі; `manager` — лише `current_version is not null` (AC-EDITOR-02);
  - `templates_insert_admin`, `templates_update_admin`, `templates_delete_admin` — лише `admin`, як були.
- **`template_sections`, `template_tasks`** — тепер це незбережені зміни: `select` лише `admin` (менеджер їх ніколи не
  бачить, AC-EDITOR-02); insert / update / delete — лише `admin`, як були (AC-EDITOR-08). Тригери
  `after insert or update or delete` ставлять `templates.has_unpublished_changes = true` (AC-EDITOR-01); так само
  тригер на зміну `templates.name` (робоче припущення QC: назва — частина версії).
- **`runs.template_version`** — номер версії, з якої запущено (AC-EDITOR-06). `launch_run` (нова версія функції, та
  сама сигнатура) копіює задачі з `template_version_tasks` поточної версії, а не з незбережених змін; шаблон без
  поточної версії — `TEMPLATE_NOT_PUBLISHED` (робоче припущення #21). Блокування: рядок шаблону `for share` до кінця
  транзакції, щоб збереження нової версії не змінило «поточну» посеред запуску (ADR 0003).
- **`save_template_version(p_template_id)`** — `private` (`security definer`, `set search_path = ''`), обгортка
  `public` (`security invoker`), `grant execute` лише `authenticated`. Першим рядком — роль із
  `private.current_app_role()`: не `admin` → `NOT_ALLOWED` (AC-EDITOR-08). Потім: шаблон `for update`; немає
  незбережених змін → `NO_UNPUBLISHED_CHANGES` (робоче припущення #22); жодної обов'язкової задачі →
  `TEMPLATE_NEEDS_REQUIRED_TASK` (AC-EDITOR-04); секція без задач → `SECTION_WITHOUT_TASKS` (робоче припущення QA);
  інакше `number = coalesce(max, 0) + 1` (версія 1 для нового), копія секцій і задач у `template_version_tasks`,
  `current_version`, `has_unpublished_changes = false` (AC-EDITOR-03).
- **Перехід даних зрізу 1:** кожен наявний шаблон — версія 1 зі знімком поточних секцій і задач, `saved_by = null`,
  `saved_at = now()`; наявні запуски — `template_version = 1`. Менеджери й далі запускають ті самі шаблони.
- **Ролі** не змінюються (`manager`, `admin`): міграції ролей у зрізі немає. Нові адреси для PM — `pm-manager@` і
  `pm-admin@example.test` у `supabase/demo-users.json`.

## Auth

- **Proxy** (`src/proxy.ts`) лише перенаправляє без входу на `/login` — UX, а не захист (AC-EDITOR-09, AC-DSYS-03).
- **Сторінки** `/templates/new`, `/templates/[id]/edit`, `/templates/[id]/versions`: `requireViewer()` (`getClaims()`
  + роль із `profiles`, ніколи з `user_metadata`); не `admin` → `Forbidden` («Not enough rights»), запитів до
  незбережених змін не робимо (AC-EDITOR-07, AC-DSYS-02). Навіть без цієї перевірки RLS не віддасть менеджеру ні
  незбережених змін, ні старих версій.
- **Server Actions редактора** (`src/app/(app)/templates/[id]/edit/actions.ts`): кожна починається з
  `requireAdmin()` — `getClaims()`, роль `admin` із `profiles` **до** будь-якого запису; інакше — помилка без запису
  (AC-EDITOR-08). Запис — серверним клієнтом користувача, тож діють RLS і column grants. Ідентифікатори секцій і задач
  з форми не довіряємо: запит обмежено `template_id` зі шляху, а RLS пускає лише `admin`.
- **Збереження версії** — лише функцією бази `save_template_version` з перевіркою ролі всередині.
- **Admin-клієнт** (`SUPABASE_SECRET_KEY`) зрізу не потрібен: Admin API не викликаємо, ключа у Vercel немає.
- **Архітектурне правило** (`architecture.yml`, крім `check:design`): `check:boundary` з матеріалів курсу і власне —
  кожен `actions.ts` у `src/app` викликає `getClaims()` / `requireViewer()` / `requireAdmin()` (крім дії входу),
  жодного `getSession()`; ADR 0006 посилається на правило.

## Рішення для ADR

- ADR 0006 «Незбережені зміни й незмінні версії шаблону» (AC-EDITOR-01…06): робочі таблиці + знімок версій проти
  JSON-знімка в одній колонці й проти версіонування рядків шаблону; як перевіряємо — тести бази й правило в
  `architecture.yml`.
