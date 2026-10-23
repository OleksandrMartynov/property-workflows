# AppShell

Каркас застосунку: сайдбар 240px, що згортається в рейку 56px (на вузьких екранах — верхня смуга 44px), поле пошуку, навігація, блок користувача й палітра команд на ⌘K. Джерело — `app-shell.tsx`.

## Сайдбар (від `md`)

- Ширина `size-sidebar` (240px), тло `sidebar`, права межа `sidebar-border`, паддинг 8px, проміжок між блоками 12px, текст `sidebar-foreground`.
- Зверху — `Logo` (рядок 36px) і кнопка пошуку: висота `size-control`, тло `card`, межа `sidebar-border`, підказка «Search…» і `kbd` ⌘K.
- Навігація «Main»: Home, Templates, Runs; рядок 32px, іконка 16px у `muted-foreground`, hover `state-hover`; поточна сторінка — `aria-current="page"`, тло `sidebar-accent`, вага 600. Підписи англійською; іконка текст не замінює.
- Шапка: `Logo` зі словами «Property Workflows» зліва, праворуч кнопка згортання (див. нижче).
- Знизу (`margin-top: auto`, верхня межа `sidebar-border`): кнопка акаунта (`AccountMenu`): `Avatar`, повний email (`break-words`, не обрізається й не рветься посеред слова) і значок chevrons-up-down 14px у `muted-foreground`; hover і відкритий стан — `state-hover`, `aria-haspopup="dialog"`, `aria-expanded`. Клік відкриває popover «Account» шириною 256px (`popover`, `elevation-3`, `Esc` закриває й повертає фокус): зверху Avatar 32px і повний email, нижче за верхньою межею `border` рядок «Role» (muted) і значення («Manager», з великої літери, вага 500). Бейджа ролі в панелі немає; роль видно лише в popover. Далі кнопка «Sign out» — `Button variant="outline"` з іконкою LogOut (16px, `muted-foreground`) на всю ширину панелі, текст `foreground`, вирівнювання вліво. Не `ghost`: має читатись як кнопка.

## Згортання в рейку (від `md`)

- Кнопка в шапці сайдбару поруч із логотипом: `Button variant="ghost" size="icon"` (32px) з іконкою PanelLeft 16px у `muted-foreground`; `aria-label` «Collapse sidebar» / «Expand sidebar», `aria-expanded` (true, коли панель розгорнута), `aria-keyshortcuts="["`. Те саме робить клавіша `[` (без модифікаторів; не спрацьовує під час набору тексту в `input`, `textarea`, `select`, `contenteditable`) і команда палітри ⌘K «Collapse sidebar» / «Expand sidebar» (підказка — `[`; підпис залежить від стану).
- Стан зберігається в `localStorage` під ключем `pw.sidebar` (`collapsed` | `expanded`); недоступний сховок не ламає: панель розгорнута.
- Ширина змінюється з `size-sidebar` (240px) на `size-sidebar-rail` (3.5rem = 56px) переходом `width` на `spring-smooth` (`spring-smooth-duration`, без перельоту); контент поруч займає звільнене місце.
- У рейці лишаються лише іконки: знак (без назви), під ним стовпчиком кнопка розгортання, іконка пошуку (поле без тексту й `kbd`), іконки навігації по центру, внизу кнопка акаунта лише з `Avatar` (email — `sr-only`, повний email лишається у popover) і `Sign out` — outline лише з іконкою. Підписи не зникають із доступного дерева: `sr-only`, плюс `aria-label` там, де видимого тексту немає. Поточна сторінка — той самий `sidebar-accent`.
- Підказки — власні, а не системний `title`: атрибут `data-tip` на цілі (клас `rail-tip`), що з'являється на `:hover` і `:focus-visible`: поверхня `popover`, межа `border`, `radius-sm`, `elevation-2`, 12 / 16, вага 500, без переносу; праворуч від цілі з відступом 10px, центр по вертикалі, `pointer-events: none`. Тексти: «Home», «Templates», «Runs», «Search  ⌘K», «Expand sidebar  [», «Account», «Sign out». У розгорнутому стані підказок немає.
- Reduced motion: підказка з'являється без анімації; ширина панелі змінюється за `duration-fast` (пружина стає `ease-standard`).

## Вузький екран

Верхня смуга висотою `size-header` (44px) на `background` з нижньою межею: знак лого, пункти навігації (`label`, поточний — `accent`) і «Sign out» (`outline` з іконкою). Сайдбар схований.

## Контент

Колонка `main`: до 1152px (`max-w-6xl`), паддинг 16px (від `md` — 32px), проміжок між блоками 24px. Заголовок сторінки — `title` (без підзаголовка й опису), дії сторінки праворуч; не більше однієї `default`-кнопки.

## Палітра команд (⌘K / Ctrl K)

`Dialog` ширини до 576px: угорі combobox («Type a command or search…», `kbd` Esc), нижче listbox із пунктами: Go to Home, Go to Templates, Go to Runs, Launch a template, Sign out. Рядок 36px; вибраний — `state-selected`; підказка групи праворуч (`meta`, `muted-foreground`). `↑ ↓` обирають, `Enter` виконує, `Esc` закриває й повертає фокус. Порожній результат: «No commands match “…”.»

## Відгук на дію

У `layout.tsx` один `InteractionFeedback`: клік по кнопці, посиланню, пункту навігації чи списку дає пульс-кільце `[data-clicked]` (520ms, токен `ring`); поки йде перехід за внутрішнім посиланням, угорі вікна біжить смуга 2px (`primary` → `ai`, до ~88%, на зміні маршруту добігає й гасне). Reduced motion: статичний контур замість кільця, статична смуга.

## Що дає споживач

`email`, `role` (рядок), `signOutAction` (серверна дія), `children` — вміст сторінки. Поточний пункт визначається за шляхом: `/` — точно, решта — за префіксом.

## Do / Don't

- Do: одна primary-дія на сторінку; глибина через hairline і крок тону.
- Do: у рейці кожна іконка має підпис (`sr-only`) і `data-tip`.
- Don't: системний `title` замість `data-tip`; ширина рейки числом — лише токен `size-sidebar-rail`.
- Don't: тіні й скло на сайдбарі (скло лише для палітри й поповерів); пункт навігації без підпису; `ghost` із приглушеним кольором для «Sign out»; обрізання email (`truncate`).
