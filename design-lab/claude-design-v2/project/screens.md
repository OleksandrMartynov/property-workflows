# Екрани

## AppShell

- **Sidebar** 240px (`size-sidebar`) на `sidebar`, правий hairline `sidebar-border`. Зверху — Logo і поле «Search… ⌘K». Навігація рядками 32px: Home, Templates, Runs; поточний пункт — `sidebar-accent` + `aria-current="page"`. Знизу — кнопка акаунта (Avatar, повний email, chevrons-up-down), що відкриває popover «Account» з email і рядком «Role · Manager» (бейджа ролі в панелі немає), і «Sign out» — `Button variant="outline"` з іконкою LogOut на всю ширину, текст `foreground`. Угорі вікна — смуга навігації (`primary` → `ai`, 2px) під час переходу.
- **Згорнутий сайдбар (рейка)** 56px (`size-sidebar-rail`): кнопка PanelLeft (ghost icon, `aria-expanded`, `aria-keyshortcuts="["`) у шапці поруч із логотипом, клавіша `[` (не під час набору) і команда «Collapse / Expand sidebar» у ⌘K; стан у `localStorage` (`pw.sidebar`), ширина змінюється на `spring-smooth`. У рейці лише іконки: знак, під ним кнопка розгортання, пошук, Home / Templates / Runs, Avatar-кнопка акаунта й outline-«Sign out» з іконкою; підписи `sr-only`, власні підказки `data-tip` (поверхня `popover`, 12px, ліворуч від цілі + 10px) на наведення й фокус. Reduced motion: підказка без анімації.
- **Вузький екран**: замість сайдбару верхня смуга `size-header` (44px) зі знаком лого, пунктами навігації й «Sign out».
- **⌘K / Ctrl K** — палітра команд (`Dialog` до 576px): переходи Home / Templates / Runs, «Launch a template», «Collapse sidebar» / «Expand sidebar» (підказка `[`), «Sign out».
- Контент: до 1152px, паддинг 16px (від `md` — 32px), проміжок між блоками 24px. Заголовок сторінки — `title` без підзаголовка й опису, дії праворуч (не більше однієї `default`). Серифа на робочих екранах немає.
- Заплановано: Users для admin, верхня смуга з breadcrumbs.

## Маршрути

| Маршрут | Вміст | Обов'язкові стани |
| --- | --- | --- |
| `/login` | Див. нижче | default, inline validation, missing / invalid, loading, reduced motion |
| `/` | «Home»: дія «Launch a template», три картки-лічильники (Active runs, Your open tasks, Completed runs), «Recent runs» зі списком | empty, loading, error |
| `/templates` | Список карток: назва, «N sections · M tasks, K required», «Launch» | empty («No templates yet.»), loading, error, permission |
| `/templates/[id]/launch` | «Launch “<template>”»: велике поле «Case name» з лічильником N/100 (без підзаголовка); «Who does what» — масове призначення «Assign all to…» (`Select`-команда) і виконавець кожної задачі `Combobox` (аватар 20px у полі; у списку аватар, ім'я, email і `RoleBadge`; порожнє значення «Unassigned»; «Me · run manager» для себе); праворуч липка картка «Run preview»: назва запуску на льоту, «0 of N done», склад, хто скільки задач має, «Launch» і ⌘/Ctrl + Enter | validation, loading, error, not found, permission |
| `/runs` | Таблиця «Run · Run manager · Progress · Next task · Assignees · Status»: назва зі шаблоном під нею, кільце й «N of M done», наступна задача, виконавці стосом, статус | empty («No runs yet.»), loading, error |
| `/runs/[id]` | Назва запуску (`title`), шаблон (опис), посилання «← Runs», статус; чекліст задач із «Mark as done» і картка «Details» (прогрес кільцем і смужкою; далі пари «підпис над значенням»: шаблон, менеджер, статус, виконавці — без двоколонкової сітки, проміжок між парами 14px, email в один рядок, `break-words` лише як запасний варіант) | loading, completed, error |
| Run not found | «Run not found» / «Back to runs» | не розкриває, чи запуск існує |

Перед останньою обов'язковою задачею — `alertdialog` (`ConfirmDialog`: назва задачі, «This cannot be undone.», «Cancel» / «OK»), після — момент завершення («Completed», світіння ≤ 400ms). Майбутні: Template builder (List · Schema · Canvas на кшталт n8n), Conditional logic, Invoice draft, Dashboard bento; AI-чернетки зі змінними `ai` і `variable`.

## Вхід (`/login`)

- Дві колонки від `lg`: ліворуч форма на `background` (мін. 26rem) із великою напівпрозорою «відлунням даху» як водяним знаком за карткою (без тексту, декор), праворуч hero-сцена `stage` — у світлій темі світла «перламутрова» (темний текст `stage-foreground`), у темній — темна кінематографічна (рух — розділ «Рух»). На вузьких екранах hero ховається.
- Ліворуч: Logo, заголовок «Sign in» (Inter 32/36, 600, трекінг −0.03em, без серифа — серіф лише в акцентному слові hero) і форма. Без підзаголовка, нижнього рядка «Accounts are created…», реєстрації, OAuth і «Forgot password». Правило мінімального тексту діє й тут.
- Поля `size="lg"` (44px), кнопка «Sign in» на всю ширину. Лише email + пароль. Hero праворуч: чипи Templates / Owners / Progress — статичний декор.
- Пароль: «Show / Hide» (`aria-pressed`), підказка «Caps Lock is on.» у `aria-live="polite"` (колір `status-due-soon-foreground`).
- Валідація на blur і submit, не на кожен символ: «Enter your email.», «Enter a valid email.», «Enter your password.» під полем (`Field error`); помилка сервера «Invalid email or password.» над кнопкою в `Alert` з `role="alert"`, фокус на перше невалідне поле.
- Loading: кнопка зі спінером, «Signing in…», поля `readOnly` (значення й фокус лишаються).
- `autocomplete="email"` / `"current-password"`; автозаповнення браузера стилізоване токенами (`field`, `foreground`).
