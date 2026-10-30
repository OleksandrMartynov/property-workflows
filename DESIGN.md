[Claude Design: Property Workflows](https://claude.ai/artifact/BamW4LNTPFw37TFKkzJU9Z)

# Дизайн-система: Property Workflows

- **Джерело:** артефакт Claude Design (тип Design System) за посиланням вище: `project/README.md` і `tokens.json` перенесені сюди; дослідження аналогів, бенчмарк 16 систем і живі прев'ю компонентів — у тому ж артефакті. Інструмент: Claude Code (Sonnet 5.5), промпти — в описі PR.
- **Вхід від PM:** розділу «Вигляд і тон» у `requirements/` на момент злиття немає, тож зміст спирається на бриф і бачення продукту (знімок вимог — шапка `docs/conformance.md`). Без брендингу клієнта.
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (власні, на токенах, без нових залежностей); перевірка — `npm run check:design` і `npm run check:contrast`.

## 1. Огляд

Інтерфейс для менеджерів і адміністраторів нерухомості: вони щодня запускають шаблони, ведуть задачі й дивляться, де застряг запуск. Основне місце роботи — робочий стіл, тому щільність як у Linear: рядки 32–44 px, контроли 32 px, мало рамок, структура відчувається, а не малюється. Тон: **спокійний, діловий, теплий, уважний**. Нейтралі теплі (відтінок 80–85), акцент — приглушений indigo (відтінок 268), що майже протилежний теплим сірим і тому читається чисто. Уникаємо: кричущих градієнтів на робочих екранах, емодзі як маркерів, сирих кольорів, пастельного «розмитого» тла замість змісту.

Єдиний навмисно «кінематографічний» екран — вхід: сцена зі шовковим WebGL-шейдером (світла в світлій темі, темна в темній), «ехо» даху з логотипу і карткою, у якій чекліст сам виконується. Це перша мить продукту. Усередині рух стриманий: 120–240 мс, ease-out, без перельоту на кольорі й прозорості. Сторінка з'являється з легким підйомом (240 мс), лічильники на головній «набираються» від нуля, кільце й смужка прогресу домальовуються, списки з'являються каскадом (перші 8, по 24 мс), `Select` закривається 140 мс. Усе зникає за `prefers-reduced-motion`. Тема — вибір «Theme»: System (за замовчуванням, слідує за виглядом пристрою через `prefers-color-scheme`), Light, Dark. Вибір лежить на пристрої (`localStorage`, ключ `pw.theme`), не в профілі, і діє на всіх сторінках, зокрема на вході; `data-theme` на `<html>` виставляє вбудований скрипт у `<head>` до першого малювання (без спалаху), для System атрибута немає.

## 2. Кольори

Імена збігаються з shadcn/ui, значення — OKLCH. У сторінках лише утиліти з колонки «Клас», ніколи hex, `bg-[#…]`, сирі палітри (`zinc-500`, `bg-white`) чи колір у `style`. Статус має три токени: `status-X` — тло-«таблетка», `status-X-foreground` — текст на ній, `status-X-mark` — іконка й крапка.

| Токен | Для чого | Світла (тло / текст) | Темна (тло / текст) | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки й основний текст | `0.991 0.004 85` / `0.21 0.008 80` | `0.178 0.004 80` / `0.945 0.004 80` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | картки, панелі, рядки таблиць | `0.998 0.002 85` / `0.21 0.008 80` | `0.200 0.005 80` / `0.945 0.004 80` | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | меню, діалоги, палітра ⌘K | `1 0 0` / `0.21 0.008 80` | `0.228 0.005 80` / `0.945 0.004 80` | `bg-popover`, `text-popover-foreground` |
| `primary` / `primary-foreground` | основна дія (одна на екран), посилання, прогрес | `0.50 0.13 268` / `0.985 0.006 268` | `0.74 0.12 268` / `0.20 0.035 268` | `bg-primary`, `text-primary-foreground`, `text-primary` |
| `secondary` / `secondary-foreground` | другорядна дія, нейтральна мітка | `0.955 0.005 85` / `0.21 0.008 80` | `0.235 0.005 80` / `0.945 0.004 80` | `bg-secondary`, `text-secondary-foreground` |
| `muted` / `muted-foreground` | приглушене тло, підписи, допоміжний текст | `0.962 0.005 85` / `0.505 0.009 80` | `0.235 0.005 80` / `0.705 0.008 80` | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | наведення, вибраний рядок меню | `0.952 0.006 85` / `0.21 0.008 80` | `0.240 0.005 80` / `0.945 0.004 80` | `bg-accent`, `text-accent-foreground` |
| `destructive` / `destructive-foreground` | небезпечна дія, текст помилки поля | `0.55 0.19 25` / `0.99 0.004 25` | `0.66 0.18 25` / `0.18 0.02 25` | `bg-destructive`, `text-destructive` |
| `border` | розділювачі, межі карток (декоративні) | `0.912 0.006 85` | `0.275 0.005 80` | `border-border` |
| `border-strong` | межі чекбокса, радіо, перемикача (≥ 3:1) | `0.60 0.01 80` | `0.54 0.008 80` | `border-border-strong` |
| `input` | межа поля вводу (≥ 3:1) | `0.60 0.01 80` | `0.54 0.008 80` | `border-input` |
| `field` | тло поля вводу | `0.998 0.002 85` | `0.198 0.005 80` | `bg-field` |
| `ring` | кільце фокусу (≥ 3:1) | `0.55 0.15 268` | `0.74 0.12 268` | `ring-ring`, `outline-ring` |
| `sidebar` / `sidebar-foreground` | бічна панель на крок тихіша за полотно | `0.968 0.005 85` / `0.30 0.008 80` | `0.158 0.004 80` / `0.86 0.005 80` | `bg-sidebar`, `text-sidebar-foreground` |
| `status-todo` / `-foreground` / `-mark` | статус «to do»: тло, текст, іконка | `0.955 0.005 85` / `0.46 0.01 80` | `0.26 0.005 80` / `0.82 0.008 80` | `bg-status-todo text-status-todo-foreground`, `text-status-todo-mark` |
| `status-progress` / `-foreground` / `-mark` | статус «in progress» | `0.955 0.02 268` / `0.47 0.13 268` | `0.27 0.05 268` / `0.82 0.08 268` | `bg-status-progress text-status-progress-foreground` |
| `status-done` / `-foreground` / `-mark` | статус «done» і «completed» | `0.955 0.04 150` / `0.47 0.12 150` | `0.27 0.05 150` / `0.82 0.12 150` | `bg-status-done text-status-done-foreground` |
| `status-overdue` / `-foreground` / `-mark` | прострочено, повідомлення про помилку | `0.955 0.022 25` / `0.47 0.16 25` | `0.27 0.06 25` / `0.82 0.10 25` | `bg-status-overdue text-status-overdue-foreground` |
| `status-due-soon` / `-foreground` / `-mark` | скоро термін, попередження | `0.955 0.045 85` / `0.47 0.095 75` | `0.27 0.05 75` / `0.82 0.12 75` | `bg-status-due-soon text-status-due-soon-foreground` |
| `ai` / `-foreground` / `-mark` | AI-чернетки й підказки (ще не в зрізі) | `0.958 0.03 325` / `0.47 0.17 325` | `0.27 0.07 325` / `0.82 0.12 325` | `bg-ai text-ai-foreground` |
| `variable` / `-foreground` / `-mark` | змінні запуску {{…}} (ще не в зрізі) | `0.955 0.03 192` / `0.45 0.075 192` | `0.27 0.04 192` / `0.82 0.09 192` | `bg-variable text-variable-foreground` |

Допоміжні токени: `state-hover` (5 % `foreground`), `state-pressed` (8 %), `state-selected` (10 % `primary`) — шар поверх будь-якого тла (`hover:bg-state-hover`); `primary-hover`, `primary-active`, `destructive-hover` — заливки в натиснутому стані; `border-hover` — межа поля під курсором, на крок темніша за `input` (похідний від `input` і `foreground`, тож діє в обох темах); `overlay` — підкладка модалок; `chart-1…5` — графіки. Токени `stage*` — сцена входу: у світлій темі світла (бліда лавандова основа, пастельні перламутрові хвилі шейдера, темний текст), у темній — кінематографічна (темна основа, світлий текст); ними користується лише hero. Шейдер читає ці токени й перемикає режим за яскравістю `--stage`.

### Контраст

Виміряно скриптом `scripts/check-contrast.mjs` (OKLCH → sRGB → WCAG 2.x) для обох тем; скрипт падає, якщо будь-яка пара нижче норми. Текст ≥ 4.5:1, межі полів, кільце фокусу й іконки-стани ≥ 3:1.

| Пара (текст або мітка → тло) | Де | Норма | Світла | Темна |
|---|---|---|---|---|
| `foreground` → `background` | Основний текст | ≥ 4.5:1 | 17.27:1 | 16.07:1 |
| `foreground` → `card` | Текст на картці | ≥ 4.5:1 | 17.62:1 | 15.41:1 |
| `muted-foreground` → `background` | Допоміжний текст | ≥ 4.5:1 | 5.73:1 | 7.19:1 |
| `muted-foreground` → `card` | Допоміжний текст на картці | ≥ 4.5:1 | 5.84:1 | 6.90:1 |
| `muted-foreground` → `muted` | Допоміжний текст на приглушеному тлі | ≥ 4.5:1 | 5.26:1 | 6.36:1 |
| `sidebar-foreground` → `sidebar` | Навігація | ≥ 4.5:1 | 12.43:1 | 12.72:1 |
| `primary-foreground` → `primary` | Основна кнопка | ≥ 4.5:1 | 5.88:1 | 7.77:1 |
| `destructive-foreground` → `destructive` | Небезпечна кнопка | ≥ 4.5:1 | 5.19:1 | 5.58:1 |
| `secondary-foreground` → `secondary` | Другорядна кнопка | ≥ 4.5:1 | 15.55:1 | 14.19:1 |
| `popover-foreground` → `popover` | Меню, діалоги | ≥ 4.5:1 | 17.72:1 | 14.45:1 |
| `primary` → `background` | Посилання й акцентний текст | ≥ 4.5:1 | 5.99:1 | 8.08:1 |
| `destructive` → `card` | Текст помилки поля | ≥ 4.5:1 | 5.32:1 | 5.35:1 |
| `input` → `card` | Межа поля вводу | ≥ 3:1 | 3.93:1 | 3.58:1 |
| `input` → `background` | Межа поля на полотні | ≥ 3:1 | 3.85:1 | 3.73:1 |
| `border-strong` → `background` | Межа чекбокса, радіо, перемикача | ≥ 3:1 | 3.85:1 | 3.73:1 |
| `ring` → `background` | Кільце фокусу на полотні | ≥ 3:1 | 4.86:1 | 8.08:1 |
| `ring` → `card` | Кільце фокусу на картці | ≥ 3:1 | 4.96:1 | 7.75:1 |
| `ring` → `sidebar` | Кільце фокусу в сайдбарі | ≥ 3:1 | 4.55:1 | 8.33:1 |
| `status-todo-foreground` → `status-todo` | Статус «to do» | ≥ 4.5:1 | 6.25:1 | 8.90:1 |
| `status-progress-foreground` → `status-progress` | Статус «in progress» | ≥ 4.5:1 | 6.14:1 | 8.63:1 |
| `status-done-foreground` → `status-done` | Статус «done / completed» | ≥ 4.5:1 | 5.74:1 | 8.87:1 |
| `status-overdue-foreground` → `status-overdue` | Статус «overdue», помилка | ≥ 4.5:1 | 6.46:1 | 8.49:1 |
| `status-due-soon-foreground` → `status-due-soon` | Статус «due soon» | ≥ 4.5:1 | 6.09:1 | 8.56:1 |
| `ai-foreground` → `ai` | Позначка AI | ≥ 4.5:1 | 6.58:1 | 8.45:1 |
| `variable-foreground` → `variable` | Чип змінної | ≥ 4.5:1 | 6.35:1 | 8.81:1 |
| `status-due-soon-foreground` → `background` | Підказка Caps Lock | ≥ 4.5:1 | 6.77:1 | 10.65:1 |
| `stage-foreground` → `stage` | Заголовок hero входу | ≥ 4.5:1 | 15.22:1 | 18.17:1 |
| `stage-muted` → `stage` | Підзаголовок hero входу | ≥ 4.5:1 | 7.44:1 | 10.60:1 |
| `stage-accent` → `stage` | Акцентне слово hero входу | ≥ 4.5:1 | 6.25:1 | 9.72:1 |
| `status-done-mark` → `background` | Іконка «done» | ≥ 3:1 | 3.33:1 | 8.68:1 |
| `status-overdue-mark` → `background` | Іконка «overdue» | ≥ 3:1 | 3.89:1 | 7.68:1 |
| `status-progress-mark` → `background` | Іконка «in progress» | ≥ 3:1 | 3.62:1 | 8.08:1 |
| `status-todo-mark` → `background` | Іконка «to do» (StatusIcon, TaskCheck) | ≥ 3:1 | 3.55:1 | 8.18:1 |
| `status-due-soon-mark` → `background` | Іконка «due soon» | ≥ 3:1 | 3.63:1 | 8.02:1 |
| `ai-mark` → `background` | Кінець смуги навігації, позначка AI | ≥ 3:1 | 5.24:1 | 7.62:1 |
| `variable-mark` → `background` | Позначка змінної | ≥ 3:1 | 3.67:1 | 8.58:1 |
| `accent-foreground` → `accent` | Підсвічений пункт меню й списку | ≥ 4.5:1 | 15.41:1 | 14.01:1 |
| `sidebar-primary-foreground` → `sidebar-primary` | Активний пункт сайдбара | ≥ 4.5:1 | 5.88:1 | 7.77:1 |
| `sidebar-accent-foreground` → `sidebar-accent` | Поточний пункт сайдбара (aria-current) | ≥ 4.5:1 | 14.64:1 | 14.56:1 |

`prefers-contrast: more` темнить `muted-foreground` і `border`, робить кільце фокусу 3 px і скло суцільним; `forced-colors` переходить на системну палітру.

## 3. Типографіка

Шрифт Inter (`--font-sans`, змінний, з віссю optical size: великі заголовки автоматично отримують щільніші «display»-форми) і JetBrains Mono (`--font-mono`) через `next/font`; єдиний виразний акцент — Instrument Serif Italic (`--font-display`; лише акцентне слово hero входу, латиниця; завантажується з Google Fonts під час збірки, npm-пакета немає); мова інтерфейсу — англійська, терміни як у глосарії PM (Templates, Runs, run manager, «N of M done»). Вага тексту 400, у темній темі 420 (компенсація світіння); підписи й кнопки 500, заголовки 600. Числа — завжди `tabular`.

| Роль | Клас | Розмір / висота рядка | Де |
|---|---|---|---|
| Великі числа | `text-display` | 28 / 32, 600 | лічильники на головній |
| Заголовок входу | `text-[2rem] font-semibold tracking-[-0.03em]` | 32 / 36, 600 | лише `h1` «Sign in» |
| Заголовок сторінки | `text-title` | 20 / 28, 600 | `h1` у `PageShell`, заголовок діалогу |
| Заголовок розділу | `text-heading` | 15 / 20, 600 | секція чекліста, картка, назва шаблону |
| Основний текст | `text-body` | 14 / 20 | комірки таблиці, опис, поля вводу |
| Підпис, кнопка | `text-label` | 13 / 18, 500 | `Label`, `Button`, навігація |
| Допоміжний | `text-meta` | 12 / 16 | помилка поля, підказка, лічильник секції |
| Заголовок hero входу | `text-hero` | clamp 36–60 px / 1.04, 600, трекінг −0.038em | hero входу, одна фраза |
| Акцент hero | `font-display italic` | Instrument Serif Italic, 1.14em | одне слово акценту в hero |
| Eyebrow | `font-mono text-eyebrow uppercase` | 11 / 16, трекінг 0.14em | рядок-ярлик над заголовком hero |

## 4. Відступи й радіуси

Сітка 4 px (`gap-1…`, `p-4`, `gap-6`). Контент сторінки — `max-w-6xl`, відступи `px-4 md:px-8`, між блоками `gap-6`; у картці `p-4`; між підписом і полем `gap-1.5`. Сайдбар 240 px (`--size-sidebar`), липка шапка 44 px на вузьких екранах.

| Радіус | Клас | Де |
|---|---|---|
| 4 px | `rounded-xs` | `kbd`, чіпи, `Badge` |
| 6 px | `rounded-sm` | кнопки, поля, пункти меню |
| 8 px | `rounded-md` | картки, таблиці, `Alert` |
| 10 px | `rounded-lg` | скляна картка hero, палітра |
| 12 px | `rounded-xl` | діалоги |
| повне | `rounded-full` | пілюлі статусів, аватари |

Висоти контролів: кнопка `sm 28 / md 32 / lg 36 / xl 44`, поле `md 32 / lg 44 / xl 48` (`size="lg"` і кнопка `xl` на вході), рядок таблиці 44 px (двохрядкова комірка «назва + шаблон»).

## 5. Компоненти й варіанти

Усі — власний код у `src/components/ui/`, на токенах; лише вони дозволені в сторінках.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` / `buttonVariants` | `default`, `soft`, `secondary`, `outline`, `ghost`, `destructive`, `link`; `sm`, `md`, `lg`, `xl`, `icon`; `loading` | `default` — одна основна дія на екран; `soft` (тло `state-selected`, текст `primary`) — акцентна дія в повторюваних елементах (Launch у картці шаблону); `destructive` — лише з підтвердженням; для `Link` — `className={buttonVariants({…})}` |
| `Input`, `Textarea`, `PasswordInput` | `size` `md` \| `lg` \| `xl`; `leading`, `trailing` | у кожного поля `Label` з `htmlFor`; межа — токен `input` (≥ 3:1); `aria-invalid` сам додає значок помилки; вимкнене — приглушене, лише читання — легка заливка |
| `SearchInput` | керований або ні | лупа, «очистити», Esc очищає; без вбудованої кнопки браузера |
| `Combobox`, `MultiSelect` | `options={[{ value, label, description?, avatar?, trailing? }]}`, `clearable`, `loading` | вибір виконавця й тегів; пошук за набором, аватар + email + роль; чипи видаляються Backspace; значення йде у форму прихованими input |
| `DatePicker`, `DateRangePicker`, `TimeField` | `min`, `max`, пресети «Today / Tomorrow / Next week» | дата й час лише київські (мітка «Kyiv time»), у форму — `YYYY-MM-DD` і `HH:MM`; жодних `<input type=date/time>` |
| `NumberField`, `CurrencyField` | `step`, `min`, `max`, `stepper` `end` | `split` | крок утриманням із прискоренням; гроші `€1,250.00`, tabular; без системних стрілок |
| `Checkbox`, `RadioGroup`, `Switch`, `Segmented`, `Slider`, `FileDrop` | — | межа `border-border-strong` (≥ 3:1); `Segmented` — «List · Schema · Canvas»; `FileDrop` — «PDF up to 20 MB»; `Switch` — миттєва дія, `Checkbox` — вибір у формі |
| `Popover` | `align`, `matchWidth` | плаваюча скляна поверхня в `body` для списків і календаря; скло лише тут |
| `Select` | `<option>` і `<optgroup>` у дітях (діти можуть бути JSX, текст — в атрибуті `label`), `defaultValue` або керований `value`, `placeholder`, `searchable` (авто > 8 варіантів), `aria-invalid` | власний listbox (ARIA select-only combobox), не системний список: ↑ ↓ Home End, Enter, Esc, набір літер; значення йде у форму через прихований input |
| `Label`, `Field` | — | `Field` додає підказку (`${id}-hint`) і помилку (`${id}-error`, `role="alert"`) |
| `Card` (+ `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`) | — | рамка один раз; не вкладати картку в картку |
| `Table` (+ `TableRow interactive`, `rowLinkClass`) | — | рядок клікабельний через посилання в першій комірці; прогрес словами «N of M done» |
| `Badge` | `neutral`, `outline`, `primary`, `changed`, `ai`, `variable` | нейтральна мітка («required», роль); `changed` — «New» / «Edited» у редакторі (теплий жовтий, як «Unpublished changes»); статус домену — лише `StatusBadge` |
| `InlineInput` | `size` `title` \| `heading` \| `body`; `commit` `blur` \| `enter`; `tone` `accent` | назва, що редагується на місці (шаблон, секція, задача): виглядає як текст, межа — під курсором і у фокусі; Enter або втрата фокусу надсилають форму, Esc повертає збережене, порожнє не надсилається; `accent` — плейсхолдер `primary` для рядка «Add a task» |
| `ToggleChip` | `onLabel`, `offLabel`, `submitOnChange` | позначка-перемикач у рядку списку («required» / «optional»): справжній checkbox, увімкнена — галочка й текст `primary` на `state-selected` (не лише колір) |
| `ActionMenu` | `items` (`separated`, `destructive`, `disabled`) | меню «⋯» рядка: `role="menu"`, ↑ ↓ Home End, Enter, Esc повертає фокус на кнопку; незворотна дія — `destructive` за розділювачем і лише через `ConfirmDialog` |
| `SaveBar` | `title`, `detail`, `icon` | плаваюча смуга збереження внизу екрана (патерн «contextual save bar»): лише коли є що зберегти; інверсна поверхня `foreground` / `background` — найпомітніший шар, дія — `default`. Редактор: «Unpublished changes», підсумок змін, «Save» і ⌘S / Ctrl S |
| `StatusBadge`, `StatusIcon` | `todo`, `progress`, `done`, `overdue`, `due-soon` | статус — завжди іконка (форма) + слово, не лише колір |
| `Alert` | `error`, `success`, `info` | помилка — `role="alert"`, текст дослівно з AC |
| `ProgressRing`, `ProgressBar` | — | кільце — у списках, смужка — у панелі «Details»; число словами поруч; ширина й заповнення анімуються переходом |
| `TaskCheck`, `CompletionGlow` | — | статус задачі: коли `done` стає true на сторінці — коло «підстрибує», галочка домальовується; коли запуск завершується — один спалах по краю панелі (≤ 400 мс); при першому показі без руху |
| `Skeleton` | — | форма майбутнього змісту на час завантаження (`loading.tsx` запусків); без блиску за reduced motion |
| `Avatar`, `AvatarStack` | — | ініціали з email, колір з хешу; повний email завжди видно поруч або в `title` |
| `EmptyState` | — | що тут буде + одна дія, що допоможе |
| `Dialog` (+ `DialogHeader`, `DialogFooter`), `ConfirmDialog` | `dialog`, `alertdialog`; `size` `sm` | `md` | `lg`; `tone` `default` | `destructive` | нативний `<dialog>`; шапка — іконка тону в колі (`primary-tint` / `destructive-tint`), заголовок, рядок наслідку; нижня смуга з діями, основна дія праворуч, на телефоні — кнопки на всю ширину, основна знизу; на екрані < 640 px вікно — нижній аркуш; у звичайному діалозі хрестик «Close» (`closable`), у `alertdialog` — ні, і клік повз вікно його не закриває. Незворотна дія — `ConfirmDialog` (не `window.confirm`), фокус на підтвердженні; видалення — `tone="destructive"` і «Remove», завершальна дія — `default` і «OK»; «Cancel» з підказкою `Esc` |
| `AppShell` | — | сайдбар 240 px, що згортається в рейку 56 px (`--size-sidebar-rail`): кнопка в шапці панелі, клавіша `[` (не під час набору тексту), команда «Collapse / Expand sidebar» у ⌘K; стан зберігається в `localStorage` (`pw.sidebar`), ширина змінюється пружиною `--spring-smooth`; у рейці лишаються іконки з власними підказками (`data-tip`, не системний `title`), підписи йдуть у `sr-only`. Пошук і команди ⌘K / Ctrl K; у `PageShell`. Футер: кнопка акаунта (аватар + повний email, шеврон) відкриває вікно `Popover` з email, роллю (рядок «Role») і вибором «Theme» (`ThemeSwitch`: `Segmented` System · Light · Dark); роль не висить бейджем у панелі. Те саме — команди ⌘K «Theme: System / Light / Dark»; на вході компактний `ThemeSwitch` у лівому нижньому куті панелі. Під нею «Sign out» — `Button variant="outline"` з іконкою на всю ширину (не ghost: має читатись як кнопка) |
| `InteractionFeedback` | — | один на застосунок (у `layout.tsx`): пульс-кільце `data-clicked` (520 мс, токен `ring`) на кожну кнопку, посилання, пункт списку й вкладку; смуга прогресу зверху (`primary` → `ai-mark`), поки йде перехід за внутрішнім посиланням; за `prefers-reduced-motion` — статичний контур |
| `FilterBar` | `views`, `view`, `query`, `searchLabel` | рядок над списком: вигляди (`Segmented`) і пошук (`SearchInput`); стан — в адресі (`?view=`, `?q=`), тож вигляд можна відкрити посиланням (лічильники головної); пошук із затримкою 300 мс, зміна скидає сторінку. Звужений список без результатів — `EmptyState` «No runs found.», порожній стан з AC — лише без фільтрів |
| `FlashNotice` | `kind` `success` / `error`; `clear`; `quiet` | відгук на дію з параметра адреси після серверної дії: показується один раз і прибирає параметр з адреси (не повертається після перезавантаження й «назад»); `quiet` — лише для скрінрідера, коли видимий відгук дає сама сторінка («<задача>: done») |
| Нагадування біля «Runs» | `openTasks` в `AppShell` | замість листів: число моїх задач «to do» на пункті «Runs» (бічна панель і мобільна смуга), для скрінрідера — «N open tasks assigned to you»; нуль — нічого |
| `Logo`, `LogoMark` | — | знак «Echo Roof» у `primary`; без жодного кольору поза токенами |
| `HeroStage`, `HeroShader` | — | лише вхід: шейдер із кольорами `--stage*`, чипи можливостей (лише назви), чекліст, що виконується сам, а за кліком — користувачем («Start over») |
| `icons` | `HomeIcon`, `TemplateIcon`, `UsersIcon`, `GaugeIcon`, `KeyIcon`… | лінійні 16 px, штрих 1.5, `currentColor`; лише декор, підпис завжди поруч |

## 6. Стани

Тексти дослівно з вимог PM (AC) і з `src/lib/runs/messages.ts`.

| Стан | Як виглядає | Текст |
|---|---|---|
| Порожній список запусків | `EmptyState` + кнопка `default` | «No runs yet.» · «Launch a template» |
| Порожній список шаблонів | `EmptyState` | «No templates yet.» |
| Запуск не знайдено (AC-TASK-10) | сторінка з `EmptyState`, без даних | «Run not found» · «Back to runs» |
| Помилка дії | `Alert` `error` над формою, введене лишається | «Enter a case name» (AC-RUN-03), «Case name must be at most 100 characters» (AC-RUN-07) |
| Відмова в праві (AC-TASK-03) | `Alert` `error` | «Only the task's assignee, the run manager, or an administrator can mark a task as done» |
| Немає права на дію (AC-TASK-18) | кнопки «Mark as done» немає | — |
| Підтвердження незворотної дії (AC-TASK-04, 16) | `ConfirmDialog`: заголовок — назва задачі | «This cannot be undone» · «Cancel» / «OK» |
| Успіх | `Alert` `success` | «Run launched.» · «Version N saved» |
| Незбережені зміни шаблону (AC-EDITOR-01) | `StatusBadge` `due-soon` у шапці й картці; `SaveBar` унизу редактора | «Unpublished changes» · «Since Version N · 1 task added · …» |
| Зміна відносно поточної версії | `Badge` `changed` біля задачі чи секції | «New» · «Edited» |
| Немає секцій у шаблоні | `EmptyState` з полем і кнопкою | «No sections yet.» · «Add section» |
| Немає шаблонів за пошуком | `EmptyState` | «No templates found.» |
| Завантаження дії | `Button loading`: спінер і слово дії; поля входу `readonly` | «Saving…», «Launching…», «Signing in…» |
| Завантаження сторінки | `Skeleton` тієї ж форми, що й зміст (`role="status"`, «Loading runs…»), без стрибка макета | — |
| Невідома адреса | `EmptyState` з дорогою додому | «Page not found» · «Back to home» |
| Непередбачена помилка | `EmptyState` і «Try again» | «Something went wrong. Try again.» |
| Помилка входу | `Alert` `error` над кнопкою, фокус на перше хибне поле | «Invalid email or password.» · «Enter your email and password.» |
| Вимкнена дія | `disabled` (`opacity-50`), пояснення поруч | — |

## 7. Доступність — мінімум

- Label у кожного поля; помилка пов'язана з полем (`aria-describedby`); на вході перевірка на blur і submit, без вбудованих підказок браузера (`noValidate`).
- Видимий фокус: outline `ring` 2 px (3 px за `prefers-contrast: more`) з відступом; Tab проходить форму по порядку; `scroll-padding` не ховає сфокусоване під шапкою.
- Контраст — таблиця в розділі 2, перевіряється скриптом.
- Статус ніколи не лише кольором: іконка іншої форми й слово.
- Спершу семантичний HTML: `<button>`, `<table>`, `<dialog>`, `<fieldset>`+`<legend>`; `aria-*` — де HTML бракує.
- Рух: усе декоративне вимикається за `prefers-reduced-motion` (hero — статичний кадр «3 з 4»); анімація входу довша за 5 с має кнопку «Pause animation» (WCAG 2.2.2); без WebGL лишається CSS-фон.
- Hero: задачі в картці — справжні `<button>` з `aria-pressed`, доступні з клавіатури; фокус усередині картки зупиняє автопоказ. Чипи можливостей — статичний декор без опису.
- Пароль: можна вставляти й користуватись менеджером паролів; «Show / Hide»; підказка «Caps Lock is on.» (`aria-live`).

## Відгук на дію й видимість тексту

- Кожен клік має видимий відгук: натиснутий стан кнопки (`scale 0.97`, темніша заливка), пульс-кільце після кліку, смуга навігації зверху, спінер і слово дії в кнопці під час запиту (`Saving…`, `Launching…`), поява результату (`animate-ui-page`, `CompletionGlow`). Тиха зміна без відгуку — дефект.
- Другорядні дії на кшталт «Sign out» не роблять `ghost` із приглушеним кольором: мінімум `outline` із `text-foreground` й іконкою; контраст тексту кнопки ≥ 4.5:1.
- Підпис над значенням (`dt` над `dd`) у вузьких панелях типу «Details»: довгий email має всю ширину панелі й не розривається посеред слова; `break-all` не використовуємо, лише `break-words` як запасний варіант.
- Текст не обрізаємо там, де він міг би поміститись: email, імена, назви задач, слова статусів переносяться (`break-all` для email, `break-words` для назв). `truncate` дозволений лише в комірках фіксованої ширини, коли повний текст є в `title` або поруч; email користувача й менеджера — ніколи.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground`, `text-muted-foreground` | `bg-zinc-900 text-white`, `bg-[#4458ad]`, `style={{ color: "#…" }}` |
| `<Button variant="outline">`, `<Link className={buttonVariants({…})}>` | власний `<button className="…">` у сторінці |
| статус через `StatusBadge` (іконка + слово) | кольорова крапка без підпису |
| `ConfirmDialog` для незворотної дії | `window.confirm` |
| новий токен через розділ 9 | новий колір «лише для цієї сторінки» |
| `tabular` для чисел і дат | пропорційні цифри в стовпцях |
| лише потрібний текст: заголовок, підписи полів, значення, помилки й тексти з AC | пояснювальні підзаголовки й підказки-«води» («Use your work email to open your workspace»), рядки на кшталт «No account yet?», копірайти, описи під заголовком, що нічого не додають |
| кільце фокусу з токена `ring` | `outline-none` без заміни |
| `Button variant="outline"` з іконкою для «Sign out» | `ghost` із `text-muted-foreground` для важливої дії |
| email і назви переносяться (`break-words`), підпис над значенням у вузьких панелях | `truncate` для email, імені чи слова статусу |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, клас.
2. `src/app/globals.css`: `--<назва>` у першому `:root` (світла) і в обох копіях темного блоку: `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` (System на темному пристрої) та `:root[data-theme="dark"] { … }` (Dark); тіла однакові, `npm run check:contrast` і `tests/design/theme.test.tsx` ловлять розбіжність.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → з'являються `bg-<назва>`, `text-<назва>`, `border-<назва>`.
4. Додайте пару до `scripts/check-contrast.mjs`, якщо токен — текст або межа; `npm run check:contrast`, `npm run check:design`.
5. Знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- `npm run check:copy` — правило тексту (розділ 8): жодних пояснювальних підзаголовків, підказок-«води» і копірайтів; виняток — коментар `copy-ok: <причина>`. Хук Claude Code (`.claude/settings.json`) запускає перевірку після кожної правки `src/**/*.tsx`; CI — job «Дизайн-система: без пояснювального тексту».
- `npm run check:contrast` — контраст пар токенів в обох темах (той самий workflow, job «Контраст токенів»).
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен — з реальною причиною.
- Візуально: знімки `/login`, `/`, `/runs`, сторінки запуску у світлій і темній темі — `docs/img/ws7-before-*` і `docs/img/ws7-after-*`; шаблони (галерея, редактор, Preview, версії, телефон) — `docs/img/ws7-templates-*`, `docs/img/ws7-editor-*`, `docs/img/ws7-versions-*`.

## Відомі прогалини першої версії

- Конструктор шаблонів (List · Schema · Canvas), AI-розбір документів, змінні запуску й інвойс — поза зрізом; токени `ai*` і `variable*` уже є, компонентів ще немає. Контролі форм (дата, час, число, мультивибір, checkbox, switch, slider, файли) готові в `src/components/ui`, але сторінки зрізу використовують лише поля, `Select` і `Combobox` виконавців.
- Контролі форм перевірено в браузері (клавіатура, обидві теми), але не автотестами: vitest запускається без DOM. Reduced motion перевірено на рівні токенів.
- Hero входу перевірено в Chrome; на слабких пристроях шейдер малює у 0.55 роздільності й ≤ 30 кадрів/с, на вузьких екранах замість нього статична смуга.
