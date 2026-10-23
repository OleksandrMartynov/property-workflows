Property Workflows — робочий інструмент для агенцій нерухомості: шаблони процесів → запуски для конкретного випадку («Apartment 12, move-in») → чекліст із прогресом і виконавцями. Тон інтерфейсу — спокійна точність рівня Linear / Raycast / Stripe: щільно, тихо, з легкою глибиною. Десктоп насамперед, тема — за системою (світла й темна спроєктовані окремо).

У сторінках і компонентах працюй лише через семантичні токени: Tailwind-утиліти `bg-primary`, `text-muted-foreground`, `border-input` або `var(--primary)`. Жодних hex і сирих палітр. Токени живуть у `tokens.json` (кольори, типографіка, відступи, радіуси, тіні, розміри, рух); компоненти й їхні правила — у каталозі Components. Окремі розділи: «Рух» (повна хореографія) і «Екрани» (каркас, маршрути, вхід). Правила тексту — у «Тон і принципи», перевірки (`check:design`, `check:contrast`, `check:copy`) — в розділі «Перевірки».

## Тон і принципи

1. **Тиша, а не декор.** Колір має сенс: `primary` — дія й фокус, `status-*` — лише статуси, `ai` — лише AI, `variable` — лише змінні запуску. Усе інше — нейтральні теплі сірі (`background`, `card`, `muted`, `border`).
2. **Щільно, але дихає.** Контрол 32px (`size-control`), рядок таблиці 44px, шапка колонок 32px, сітка 4px.
3. **Статус ніколи лише кольором.** Завжди іконка своєї форми + слово: «done», «overdue», «2 of 5 done». Done (зелений) і Overdue (червоний) відрізняються формою іконки й текстом, не лише відтінком.
4. **Власний вигляд замість браузерного.** Свої поля, списки, календар, фокус, selection, scrollbar, автозаповнення. Нативних `<select>`, `<input type="date | time | number | range">` і системного діалогу підтвердження в сторінках немає: є Select-родина, DateTime, NumberField, Slider і `ConfirmDialog`.
5. **Рух живий, але стриманий.** Нічого не з'являється миттєво й не стрибає; нічого видовищного. Рух усередині застосунку спокійний, виразний лише hero входу (див. розділ «Рух»).
6. **Мінімум тексту.** Інтерфейс говорить заголовками, підписами полів, значеннями, помилками й текстами з AC; решту прибираємо (див. «Правило мінімального тексту»).

### Контент

- Мова інтерфейсу — англійська, sentence case, без крапки в кнопках і заголовках; крапка — у повних реченнях помилок: «Mark as done», «Launch run», «Add task».
- Кнопка = дієслово + об'єкт: «Mark as done», «Launch a template». Не «OK» там, де є конкретна дія (виняток — підтвердження в ConfirmDialog).
- Прогрес — «2 of 5 done». Статуси — слова словника продукту малими літерами: задача «to do» / «done», запуск «in progress» / «completed»; дизайн має ще «overdue» і «due soon».
- Помилки кажуть, що сталося й що робити, без вибачень і «Oops»: «Invalid email or password.», «Enter your email and password.», «Run not found». Незворотне: «This cannot be undone.»
- Порожній стан = заголовок з AC й одна дія: «No runs yet.» · «Launch a template». Без пояснювального рядка.
- Дані в макетах лише синтетичні: `ana@example.test`, `oleh@example.test`, `manager@example.test`; запуски «Apartment 12, move-in», «House 3, inspection»; змінні `{{tenant_name}}`. Аватари — ініціали, не фото. Жодних справжніх компаній, адрес і людей. Емодзі як маркерів не використовуємо.

### Правило мінімального тексту

- У UI лише: заголовки, підписи полів, значення, повідомлення про помилки й тексти з AC. Немає: підзаголовків під заголовком сторінки чи форми («Welcome back…»), описів і «води», підказок «про всяк випадок», рядків на кшталт «No account yet?» чи «Accounts are created by your administrator.», футерів із копірайтом, описів під пунктами радіо, чекбокса й перемикача, порожніх станів із поясненням.
- Підказка поля — лише реальна інформація формату чи валідації: лічильник «21/100», «Caps Lock is on.», помилка «Enter a valid email.». Прикладом із вигаданого пояснення вона не стає.
- Правило виконує `npm run check:copy` (хук перед комітом і job у CI): він зупиняє нові рядки, що не є підписом, значенням, помилкою чи AC.
- Приклади в прев'ю компонентів дотримуються правила; підписи `.cap` над блоками прев'ю — документація системи, а не текст інтерфейсу.

## Кольори

Усі кольори — OKLCH. Імена базового набору збігаються зі shadcn/ui (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar-*`, `chart-1…5`), доменні — власні.

- **Нейтралі** теплі (відтінок 80–85, насиченість ≤ 0.010) — майже навпроти indigo-primary (H 268): primary читається чистіше, а «паперові» поверхні пасують до договорів та інвойсів. У dark насиченість ≤ 0.005, щоб сірі не буріли.
- **Поверхні** піднімаються сходинками: `sidebar` (тихіший за полотно) → `background` → `card` → `popover`. У світлій темі глибина — hairline і тінь, у темній — світліша поверхня.
- **Primary** — indigo: заливка лише для однієї головної дії на екрані, посилання, заповнення прогресу. У dark заливка світла (L 0.74), текст на ній темний (`primary-foreground`): це задумано, не інверсія. Те саме для `destructive`.
- **Доменні кольори — три ролі на кожен**: `status-done` — тло-тінт бейджа чи алерта, `status-done-foreground` — текст на тінті й на полотні (≥ 4.5:1), `status-done-mark` — крапка й іконка (≥ 3:1 до полотна). Так само `status-todo`, `-progress`, `-overdue`, `-due-soon`, `ai`, `variable`. Суцільних статусних заливок із текстом не робимо. Статус запуску «Completed» — це `status-done`.
- **Однакова світлість у межах ролі** (мітка L 0.62 / 0.74, текст L 0.47 / 0.82, тінт L 0.955 / 0.27): бейдж не «важчає» при зміні статусу. Відтінки: Done H 150, Overdue H 25, Due soon H 75, In progress H 268; `ai` H 325, `variable` H 192.
- **Межі**: `border` — декоративний hairline (сам нічого не означає); межа, що визначає контрол, — `input` (поле) або `border-strong` (чекбокс, радіо, перемикач, стан), обидві ≥ 3:1. Заливка поля — `field`.
- **Hero входу**: токени `stage*` різні в темах: світла тема — світла «перламутрова» сцена (`stage` L 0.955, темний `stage-foreground`, `stage-accent` indigo), темна — темна кінематографічна. Контраст тексту сцени ≥ 4.5:1 в обох (таблиця «Контраст»). Ліва панель входу має велике напівпрозоре «відлуння даху» як водяний знак за карткою (без тексту).
- **Широка гама**: на P3-екранах лише мітки (`status-*-mark`, `ai-mark`, `variable-mark`) отримують більшу насиченість; текстові токени лишаються в sRGB, тож виміряний контраст правдивий. Це живе в `globals.css`, у `tokens.json` значення sRGB.
- **Підвищений контраст** (`prefers-contrast: more`): `muted-foreground` і `border` темнішають (у dark — світлішають), кільце фокусу 3px, скло суцільне. `forced-colors`: кільце `Highlight`, межі `CanvasText`.

### Який клас коли

| Роль | Утиліти | Токени |
| --- | --- | --- |
| Сторінка | `bg-background text-foreground` | `background`, `foreground` |
| Картка, таблиця | `bg-card text-card-foreground border border-border shadow-sm` | `card`, `border`, `elevation-1` |
| Плаваючий шар: діалог, меню, палітра | `bg-popover text-popover-foreground shadow-lg` | `popover`, `elevation-3` |
| Основна дія (одна на екран) | `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active` | `primary`, `primary-foreground` |
| Вторинна дія | `bg-secondary text-secondary-foreground hover:bg-accent` | `secondary`, `accent` |
| Допоміжний текст, підписи, placeholder | `text-muted-foreground` | `muted-foreground` |
| Тиха заливка: трек, disabled, шапка таблиці | `bg-muted`, `bg-muted/50` | `muted` |
| Декоративна межа | `border-border` | `border` |
| Поле вводу | `border-input bg-field` | `input`, `field` |
| Межа стану, hover картки-посилання | `border-border-strong` | `border-strong` |
| Фокус | глобальний `:focus-visible` (outline `ring`), не `ring-*` | `ring`, `ring-width`, `ring-offset` |
| Деструктивна дія, помилка поля | `bg-destructive text-destructive-foreground`; `text-destructive`, `aria-invalid:border-destructive` | `destructive` |
| Статус | `bg-status-done text-status-done-foreground` + іконка `text-status-done-mark` | `status-*` (три ролі) |
| AI-чернетка, змінна запуску | `bg-ai text-ai-foreground`, `bg-variable text-variable-foreground` | `ai*`, `variable*` |
| Hover, натискання, вибраний рядок | `hover:bg-state-hover`, `active:bg-state-pressed`, `bg-state-selected` | похідні, див. нижче |
| Сайдбар, поточний пункт | `bg-sidebar text-sidebar-foreground`, `bg-sidebar-accent` | `sidebar*` |
| Підкладка під діалогом | `bg-overlay` | `overlay` |
| Плаваючий список, календар, поповер | `surface-float` (скло: `glass-bg`, blur `glass-blur`, `elevation-3`) | `popover`, `glass-alpha` |
| Активний рядок плаваючого списку | `bg-accent-float` | `accent-float` |
| Фон вибраного, збіг пошуку, діапазон | `bg-primary-tint`, `bg-primary-tint-strong`, `bg-match` | похідні від `primary` |
| Тло помилки й виконаного в контролі | `bg-destructive-tint`, `bg-done-tint` | похідні від `destructive`, `status-done` |
| Вимкнений трек і заливка вимкненого контролу | `bg-control-off`, `bg-control-disabled` | похідні від `muted`, `muted-foreground` |

### Похідні токени (немає в `tokens.json`)

Формат токенів не читає `color-mix()`, тому стани рахуються формулами; вони ті самі в `globals.css` і в `<style>` кожного прев'ю. Усі — у `oklab`, бо в `oklch` відтінок «їде»:

- `state-hover` = `foreground` 5% до прозорого; `state-pressed` = `foreground` 8%; `state-selected` = `primary` 10%.
- `primary-hover` = `primary` + 10% `foreground`; `primary-active` = + 18%; `destructive-hover` = `destructive` + 10% `foreground`.
- `selection` = `primary` 24%; `scrollbar-thumb` = `foreground` 16% (hover 28%); `skeleton` = `muted`, `skeleton-sheen` = `muted` + 6% `foreground`; `glow-done` = `status-done-mark` 32%; `glass-bg` = `popover` на `glass-alpha`.
- Контроли форм (розділ «Контролі форм» у `globals.css`; усе `color-mix()`, тому лише тут і в PRELUDE прев'ю): `accent-float` = `popover` + 7% `foreground` (oklab; активний рядок списку); `primary-tint` = `primary` 12%, `primary-tint-strong` = 22%, `match` = 20% (oklch; вибрана пілюля й діапазон, сильніший hover, збіг пошуку); `destructive-tint` = `destructive` 10%; `done-tint` = `status-done` 14%; `control-off` = `muted` + 6% `foreground` (вимкнений трек перемикача, рейка slider, «+N»); `control-disabled-fill` = `muted-foreground` + 62% `background` (заливка вимкненого контролу й текст disabled).
- Поле на hover: межа `input` + 14% `foreground` (`border-hover`, oklab); раніше — 60% `foreground` (застаріло).
- `forced-colors`: `accent-float` і `match` стають `Highlight`.
- Пружина `spring-bouncy` (перельот ~4.5%, `spring-bouncy-duration` 360ms) — локальний токен `controls.css` лише для малих перемикачів (кулька, галочка, радіо); за reduced motion — `ease-standard`.

## Контраст

Контраст пораховано з токенів за WCAG 2: текст ≥ 4.5:1, межі контролів, кільце фокусу й іконки-мітки ≥ 3:1 — в обох темах.

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
| `status-done-mark` → `background` | Іконка «done» | ≥ 3:1 | 3.33:1 | 8.68:1 |
| `status-overdue-mark` → `background` | Іконка «overdue» | ≥ 3:1 | 3.89:1 | 7.68:1 |
| `status-progress-mark` → `background` | Іконка «in progress» | ≥ 3:1 | 3.62:1 | 8.08:1 |
| `stage-foreground` → `stage` | Заголовок hero входу | ≥ 4.5:1 | 15.22:1 | 18.17:1 |
| `stage-muted` → `stage` | Підзаголовок hero входу | ≥ 4.5:1 | 7.44:1 | 10.60:1 |
| `stage-accent` → `stage` | Акцентне слово hero входу | ≥ 4.5:1 | 6.25:1 | 9.72:1 |

## Типографіка

Шрифт — **Inter** (змінний, з віссю optical size 14–32: на великих розмірах дає щільніші «display»-форми, на 14px — текстові; `font-optical-sizing: auto`), моно — **JetBrains Mono** (`font-mono`; рядок-ярлик hero). Єдиний виразний акцент — **Instrument Serif Italic** (`font-display`): лише акцентне слово hero входу, латиниця. Усе інше, зокрема заголовок «Sign in» і весь робочий простір, — Inter без засічок. Усі гарнітури підключає Google Fonts (hosted; файлів у системі немає). Стеки: `font-sans`, `font-mono`, `font-display`; запасні — системні (`ui-sans-serif`, `system-ui`, «Segoe UI»).

| Стиль | Розмір / інтерліньяж | Вага | Трекінг | Де |
| --- | --- | --- | --- | --- |
| `display` | 28 / 32 | 600 | −0.03em | Великі числа-лічильники на головній |
| заголовок входу (не токен: `text-[2rem]`) | 32 / 36 | 600 | −0.03em | Лише `h1` «Sign in» |
| `title` | 20 / 28 | 600 | −0.016em | `h1` сторінки, заголовок діалогу |
| `heading` | 15 / 20 | 600 | −0.008em | Заголовок картки, секції, порожнього стану |
| `body` | 14 / 20 | 400 (dark 420) | −0.006em | Усе основне: рядки, поля, абзаци, Alert |
| `label` | 13 / 18 | 500 | — | Підписи полів, кнопки, навігація, «2 of 5 done» |
| `meta` | 12 / 16 | 400 | +0.004em | Заголовки колонок, бейджі, помилки під полем, лічильники |
| `hero` | clamp 36–60 px / 1.04 | 600 | −0.038em | Одна фраза hero входу |
| `eyebrow` | 11 / 16, `font-mono`, uppercase | 500 | +0.14em | Рядок-ярлик над заголовком hero |
| акцент hero | 1.14em, `font-display italic` | 400 | — | Одне слово в hero, більше ніде |

- Заголовок «Sign in» — Inter 32/36, 600, трекінг −0.03em; серифа на екрані входу немає (серіф — лише акцентне слово hero). Робочі екрани серифа не мають.
- У dark основний текст важить 420, не 400 (`--weight-body`; у `tokens.json` стиль `body` записано з 400): світлий текст на темному не «худне». Підписи й кнопки — 500, заголовки — 600.
- Усі числа — прогрес, гроші, дати, лічильники — з `tabular-nums` (утиліта `tabular`): цифри не стрибають.
- Дрібні винятки всередині компонентів: `kbd` 11 / 16, ініціал аватара 10px вагою 600, пілюля «Kyiv time» 11px. Заголовки `text-wrap: balance`, абзаци `pretty`.
- JetBrains Mono використовується лише в рядку-ярлику hero; окремого текстового стилю для інтерфейсу немає.

## Відступи, радіуси, щільність

- Відступи — сітка 4px: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48 · `space-16` 64. Півкроки `space-0-5` 2, `space-1-5` 6, `space-2-5` 10 — лише всередині компонентів (іконка ↔ текст, паддинг алерта).
- Щільність: `size-control` 32 (за замовчуванням), `size-control-sm` 28, `size-control-lg` 36 (форма входу, порожні стани); рядок таблиці 44, шапка колонок 32; `size-header` 44; `size-sidebar` 240; `size-sidebar-rail` 56 (3.5rem, згорнутий сайдбар); іконка 16 (14 у малих контролах і статус-бейджі).
- Паддинг контролу 12px, малого — 10px; іконка ↔ текст 6px.
- Розміри контролів форм (токени в rem, масштабуються зі шрифтом): `size-check` 1rem (чекбокс, радіо), `size-switch-w` × `size-switch-h` 2rem × 1.25rem, `size-thumb` 1rem і `size-track` 0.25rem (slider), `size-day` 2rem і `size-popover-cal` 17rem (календар), `size-option` 2rem і `size-option-rich` 2.75rem (рядок списку), `size-listbox-max` 16.5rem, `size-chip` 1.375rem, `size-hit` 1.5rem (мінімальна ціль, WCAG 2.5.8). Висота поля: `md` 32 / `lg` 44 / `xl` 48 (`lg` — форма входу); кнопка `lg` лишається 36.
- Радіуси за роллю, а не «rounded-lg скрізь»: `radius-xs` 4 — бейдж, kbd; `radius-sm` 6 — кнопки й поля (база шкали); `radius-md` 8 — картки, таблиці, алерти; `radius-lg` 10 — великі плитки й скляні картки; `radius-xl` 12 — діалоги й палітра; `radius-pill` — статус-бейдж, аватар, смужка прогресу.

## Поверхні й тіні

- Всередині сторінки глибина — hairline `border` плюс крок тону; тінь лише для того, що лежить (`elevation-1`: картка, таблиця, основна кнопка), підіймається (`elevation-2`: hover картки-посилання, поповер) або плаває (`elevation-3`: діалог, палітра).
- У dark тіні густіші й мають верхній відблиск 1px (`inset`), а вищий шар світліший (`popover` над `card`).
- Плаваючі поверхні (список Select / Combobox / MultiSelect, календар, поповер часу) — `surface-float`: скло `glass-bg` із blur `glass-blur` і saturate 1.4, межа `border`, `radius-md`, `elevation-3`; відкриваються від `transform-origin` біля якоря й перевертаються вгору, коли знизу тісно.
- Діалог не скляний: `popover` над підкладкою `overlay` з розмиттям 4px. Glass (`glass-alpha` 84%, `glass-blur` 20px) — лише для шарів, що плавають; не клади glass на glass. `prefers-reduced-transparency` і `forced-colors` роблять усе непрозорим через токени.

## Рух

Коротко (деталі й повний перелік — розділ «Рух»): інтерфейс 90–240ms, завершення запуску ≤ 400ms, вихід = вхід × 0.7. Токени: `duration-*`, `ease-standard` / `ease-emphasized` / `ease-exit` / `ease-in-out-soft`, пружини `spring-snappy` (press, меню, поповер) і `spring-smooth` (діалог, панелі), `distance-1/2/3` 2 / 4 / 6px, `distance-slide` 24px (перегортання місяця), `scale-press` 0.97, `scale-enter` 0.98, `scale-thumb` 1.12 (бігунок slider).

- Анімуй лише `transform`, `opacity`, `filter` і колір. `opacity` і колір не на пружині з перельотом; перельот (`spring-bouncy`) — лише в малих перемикачах.
- Hover — тінт, ніколи не зміна розміру чи ваги. Press — `scale(0.97)` (`scale-press`) на `spring-snappy`, плюс пульс-кільце після кліку (розділ «Відгук на дію й видимість тексту»).
- Плаваюча поверхня: вхід на `spring-snappy` (зсув 4px + 0.98), вихід 100ms швидше.
- Декоративний рух при `prefers-reduced-motion` зникає цілком, значущий — стає коротким fade.

## Стани й доступність

| Стан | Вигляд |
| --- | --- |
| hover | Тінт `state-hover` або `primary-hover`; для поля — межа 60% `foreground`; картка-посилання — `border-strong` і `elevation-2`. Розмітка не зсувається |
| focus-visible | Суцільний outline `ring-width` кольору `ring`, відступ `ring-offset`; у рядках і клітинках усередину (`-2px`); для поля — усередину межі (`-1px`) і межа `ring`; для invalid — `destructive`; ніколи glow |
| active | `scale(0.97)` на `spring-snappy`; фон `primary-active` / `state-pressed` |
| clicked | пульс-кільце `[data-clicked]` 520ms токеном `ring` (від 60% до 0% прозорості, до 7px); reduced motion — статичний `outline` 2px `ring` |
| disabled | кнопка `opacity: 0.5`; поле й контроли — заливка `muted`, межа `border`, текст `muted-foreground`, вимкнена заливка `control-disabled-fill`; курсор `not-allowed` |
| invalid | Межа й outline `destructive`, значок оклику в полі, повідомлення `meta` зі значком під полем із `role="alert"` і `aria-describedby`; є текст, не лише колір |
| loading | Кнопка `aria-busy`, спінер 14px і «Signing in…»; поля `readOnly`; списки — skeleton із відблиском |
| empty / error | Одне речення + одна дія; помилка — `Alert`, порожній стан — `EmptyState` |

- Текст ≥ 4.5:1, кільце фокусу й межі контролів ≥ 3:1 в обох темах (таблиця вище). Цілі ≥ 24×24px.
- Стан передається через ARIA (`aria-current`, `aria-pressed`, `aria-invalid`, `aria-selected`, `aria-busy`), не лише класами.
- Діалог — нативний `<dialog>` (фокус-пастка, `Esc`); `alertdialog` не закривається кліком повз вікно; початковий фокус `ConfirmDialog` — на кнопці підтвердження. Палітра ⌘K — combobox над listbox: `↑ ↓` обирають, `Enter` виконує, `Esc` закриває й повертає фокус.
- `forced-colors` не ламає компонент: кільце `Highlight`, межі `CanvasText`, скло непрозоре.

## Відгук на дію й видимість тексту

- Кожен клік має видимий відгук: натиснутий стан кнопки (`scale(0.97)` = `scale-press`, темніша заливка), пульс-кільце після кліку (`[data-clicked]`, 520ms, токен `ring`), смуга навігації зверху, спінер і слово дії в кнопці під час запиту («Saving…», «Launching…»), поява результату (`animate-ui-rise`, `CompletionGlow`). Тиха зміна без відгуку — дефект.
- Смуга навігації: 2px, градієнт `primary` → `ai-mark`, поки йде перехід за внутрішнім посиланням; біжить до ~88%, на зміні маршруту добігає до кінця й гасне. Живе в `InteractionFeedback` (один на застосунок, у `layout.tsx`; `feedback.css`).
- Другорядні дії на кшталт «Sign out» — не `ghost` із приглушеним кольором: `Button variant="outline"` з іконкою LogOut на всю ширину футера сайдбару, текст `foreground`, іконка `muted-foreground`; контраст тексту ≥ 4.5:1.
- Блок користувача в сайдбарі — кнопка акаунта (Avatar, повний email, значок chevrons-up-down); за кліком відкривається невеликий popover «Account»: email, а під ним рядок «Role · Manager». Ролі бейджем у панелі немає. Нижче — «Sign out».
- Текст не обрізаємо там, де він міг би поміститись: email, імена, назви задач, слова статусів переносяться (`break-words` як запасний варіант: слово ніколи не рубається посеред). `truncate` — лише в комірках фіксованої ширини, коли повний текст є в `title` або поруч; email користувача й менеджера — ніколи.
- `prefers-reduced-motion`: замість пульс-кільця — статичний контур `outline: 2px solid ring`; смуга навігації — статична, на всю ширину; `scale-press` → 1.

## Іконографія

Inline SVG на сітці 16×16, штрих 1.4–1.8, `currentColor`, кінці й з'єднання заокруглені; у малих контролах 14×14. Іконки оптично центруються. Статусні іконки: пунктирне кільце (to do), кільце з половиною заливки (in progress), галочка в колі (done), знак оклику в колі (overdue), годинник (due soon). Кільце прогресу — окрема іконка `ProgressRing`. Навігація: Home, Templates, Runs. Емодзі не використовуємо. Окремого набору іконок і спрайта немає: іконки лежать у компонентах.

## Лого

Знак **Echo Roof** — два вкладені контури даху й суцільні «двері»: дім і запуск, що просувається етапами. Файли й правила — у групі Logos і в README компонента Logo. Одне чорнило (`primary`, `foreground`, `sidebar-foreground`; `primary-foreground` на плитці `primary`), ніколи `ai`. У сайдбарі — сітка 20, фавікон — сітка 16. Лок-ап: знак у `primary` + «Property Workflows» Inter 600.

## Каталог компонентів

Усі компоненти — власний код на токенах у `src/components/ui`; сторінки використовують лише їх. Докладно — README компонента в каталозі Components.

| Компонент | Варіанти й стани | Правила й ARIA |
| --- | --- | --- |
| `Button`, `buttonVariants` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; `sm` 28 · `md` 32 · `lg` 36 · `icon`; `loading` | одна `default` на екран; `destructive` лише з підтвердженням; loading = `aria-busy`, спінер і слово дії; press `scale(0.97)` і пульс-кільце після кліку; «Sign out» — `outline` з іконкою, не `ghost` |
| `Input`, `Textarea`, `SearchInput`, `PasswordInput` | `md` 32 · `lg` 44 · `xl` 48; `leading`, `trailing`, `clearable`; invalid, disabled, read-only; Textarea росте до 6 рядків | межа `input` ≥ 3:1; значки справа резервують місце; пароль можна вставляти; без resize-«хвостика» |
| `Field`, `Label` | зірочка `required`, «Optional», помилка зі значком, лічильник «21/100» | `label for`, `aria-describedby`, `aria-invalid`, помилка `role="alert"`; підказка лише з реальною інформацією |
| `Select` | `options` із описом, аватаром, групами; пошук при > 8; loading; invalid; disabled | select-only combobox, ↑ ↓ Home End Enter Esc, набір літер; значення — в прихованому input |
| `Combobox` | аватар, «Clear», рядки: ім'я, email, роль; loading; invalid | ARIA 1.2 combobox, `aria-activedescendant`; вільного тексту немає; Enter не відправляє форму |
| `MultiSelect` | фішки з «✕», `compact` із «+N», рядки з чекбоксом | `aria-multiselectable`; Backspace видаляє фішку; FLIP-перестановка |
| `DatePicker`, `DateRangePicker` | текст або календар, швидкі дати Today / Tomorrow / Next week, позначка «Kyiv time» | ARIA grid, стрілки / Home / End / PgUp / PgDn, Esc повертає фокус; ISO у формі |
| `TimeField` | сегменти години й хвилини, поповер зі стовпцями | `spinbutton`, ↑ ↓ ±1, PgUp / PgDn ±10, Backspace очищає |
| `NumberField`, `CurrencyField` | stepper `end` / `split` / `none`, `€1,250.00`, `align` | `spinbutton`, hold-to-repeat із множником ×2 / ×5 / ×10, колесо вимкнене |
| `Checkbox`, `CheckboxGroup` | unchecked, checked, mixed, disabled, invalid, `tone="done"` | справжній `<input>`, `fieldset` + `legend`, підсумок «2 of 3 done» |
| `RadioGroup` | column, row, disabled, invalid | `radiogroup`, roving tabindex, стрілки вибирають |
| `Switch` | on, off, busy (дуга), disabled, label left | `role="switch"`, Space і Enter, `aria-busy` |
| `Segmented` | `sm` · `md` · `lg`, `block`; бігунок ковзає | `radiogroup` + `radio`, стрілки вибирають, Home / End |
| `Slider` | single, range, bubble, scale, disabled, `tone="ai"` | `role="slider"` на бігунку, ±step, PgUp / PgDn, Home / End, `aria-valuetext` |
| `FileDrop` | idle, drag over, uploading, done, error, disabled | «Choose file» завжди, список `aria-live`, прогрес `role="progressbar"` |
| `Popover` | вхід `spring-snappy`, вихід швидший; flip вгору | портал у `body`, закривається кліком поза; Esc — за власником |
| `Card` | `CardHeader`, `CardContent`, `CardFooter`; картка-посилання | рамка один раз, без картки в картці |
| `Table` | `TableRow interactive`, `rowLinkClass` | рядок клікабельний через посилання в першій комірці |
| `Badge`, `StatusBadge`, `RoleBadge` | `neutral`, `outline`, `primary`, `ai`, `variable`; `todo` … `due-soon`; admin, manager | статус і роль — іконка + слово, не лише колір |
| `Alert` | `error`, `success`, `info` | помилка `role="alert"`, текст з AC |
| `ProgressRing`, `ProgressBar`, `TaskCheck`, `CompletionGlow` | кільце в списках, смужка в «Details» | число словами поруч; завершення — один спалах ≤ 400ms |
| `Skeleton`, `EmptyState` | форма майбутнього змісту; заголовок + одна дія | `role="status"`; опису немає |
| `Avatar`, `AvatarStack` | ініціали з email, колір з хешу | повний email поруч або в `title` |
| `Dialog`, `ConfirmDialog` | `dialog`, `alertdialog` | нативний `<dialog>`; фокус на підтвердженні; `alertdialog` не закривається кліком повз |
| `AppShell`, `Logo`, `icons` | сайдбар 240px, що згортається в рейку 56px (`size-sidebar-rail`): кнопка PanelLeft у шапці, клавіша `[`, команда «Collapse / Expand sidebar» у ⌘K, стан у `localStorage` (`pw.sidebar`); ⌘K, знак «Echo Roof»; «Sign out» — `Button variant="outline"` з іконкою LogOut на всю ширину панелі | у рейці лише іконки, підписи `sr-only`, підказки `data-tip`; кнопка акаунта (Avatar, повний email, chevrons-up-down) відкриває popover з email і рядком «Role · Manager», ролі бейджем у панелі немає; лінійні іконки 16px — лише декор |
| `InteractionFeedback` | один на застосунок (`layout.tsx`): пульс-кільце `data-clicked` (520ms, `ring`) на кнопці, посиланні, пункті списку й вкладці; смуга навігації зверху (`primary` → `ai-mark`, 2px) під час переходу | смуга `aria-hidden`; reduced motion — статичний контур і статична смуга |

## Перевірки

Три перевірки в застосунку; їхні правила — це правила цієї системи.

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза `src/components/ui` і `globals.css`. Виняток — коментар `design-ok: <причина>` у тому ж рядку.
- `npm run check:contrast` — пари токенів в обох темах: текст ≥ 4.5:1, межі, кільце фокусу й іконки-мітки ≥ 3:1 (таблиця «Контраст» вище).
- `npm run check:copy` — правило мінімального тексту: у UI лише заголовки, підписи, значення, помилки й тексти з AC; запускається хуком перед комітом і job у CI.

У цьому пакеті: `node build-tokens.mjs`, `node build-previews.mjs`, `node build-index.mjs`, `node check.mjs` (граматика токенів, контраст і збіг таблиці, прев'ю, README компонентів, індекс).

## Do / Don't

- **Do:** `Button variant="outline"` з іконкою для «Sign out»; email і назви переносяться лише по межах слів (`break-words`, без `break-all`); у панелі «Details» підпис стоїть над значенням, email в один рядок; кожна дія має видимий відгук (press, пульс-кільце, смуга навігації, спінер із дієсловом); одна primary-дія на екран; статус = іконка + слово; числа з `tabular-nums`; тіні лише для того, що лежить, підіймається чи плаває; dark проєктуй окремо (світлі заливки з темним текстом); підпис завжди видно поруч із полем.
- **Також Do:** повідомлення лише з тексту AC і помилок; підказка — лише з реальною інформацією (лічильник, формат); список вибору — Select-родина, дата й час — DateTime.
- **Don't:** `ghost` із `muted-foreground` для важливої дії; `truncate` для email, імені чи слова статусу; тиха дія без відгуку; фіолетово-сині градієнтні герої; неон на чорному; емодзі-маркери; тінь вища за `elevation-1` на картці в потоці сторінки; картка в картці; `ai`, `variable` чи `status-*` як декор; літеральні кольори (hex, `rgb()`) у компонентах; `window.confirm`; статус лише кольором; поле без підпису з placeholder замість нього; підзаголовки, «воду» й футери з копірайтом; серіф на екранах, окрім акцентного слова hero; нативні `<select>` і `<input type="date">`.

## Як додати токен

1. У `globals.css` додай `--назва` у світлий `:root` і, якщо значення різне, в `@media (prefers-color-scheme: dark)`; для Tailwind-утиліти — `--color-назва` у `@theme inline`.
2. Для кольору дотримуй три ролі (тло, `-foreground`, `-mark`), у OKLCH; текст ≥ 4.5:1, мітки й межі ≥ 3:1 в обох темах.
3. Додай рядок usage у словник генератора `build-tokens.mjs` (без нього генератор зупиняється) і запусти його: він перезбирає `tokens.json`. Назви унікальні в усіх родинах, крім типографіки; значення кольору — без `var()` і `color-mix()`.
4. Якщо токен — текст або мітка з нормою контрасту, додай пару в таблицю «Контраст» цього README і перевір її.
5. Похідний колір (`color-mix()`) у `tokens.json` не потрапляє: опиши його формулу в розділі «Кольори» цього README і в PRELUDE `build-previews.mjs`.
6. Опублікуй `tokens.json` і зміни README: токен, якого немає в обох місцях, для споживача не існує.

## Відомі прогалини

- **Конструктор шаблонів** (List · Schema · Canvas із drag-and-drop) — ще не реалізовано, компонентів і токенів для нього немає; `Segmented` «List · Schema · Canvas» уже є як контрол.
- **Ще немає компонентів:** toast, tooltip, Tabs, DataGrid. Є `Skeleton` (скелети запусків), `TaskCheck` і `CompletionGlow` (оживлення завершення задачі й запуску).
- **Select без JavaScript** не відкривається (форма запуску надішле виконавцем за замовчуванням); календар і поповер часу теж потребують JavaScript, хоча текстове введення дати працює без нього.
- Компоненти ще мають типові тексти порожнього результату з пояснювальним рядком (`emptyHint`); за правилом мінімального тексту в UI показується лише «No matches».
- **JetBrains Mono** використовується лише в рядку-ярлику hero; токени `chart-1…5` і `sidebar-primary*` зарезервовані й у застосунку поки не використовуються.
- `HeroStage` (hero-сцена з шейдером) існує лише на `/login` і в каталозі без картки: це вітрина сторінки входу, а не компонент системи.

## Hero входу й дрібні правила

- **Типографіка hero:** `text-hero` (clamp 36–60 px, висота 1.04, вага 600, трекінг −0.038em); акцентне слово — `font-display italic` (Instrument Serif Italic, 1.14em, `stage-accent`); рядок-ярлик над заголовком — `font-mono text-eyebrow uppercase` (JetBrains Mono, 11/16, трекінг 0.14em). Заголовок форми входу «Sign in» — Inter 32/36, 600, без серифа.
- **Іконки:** лінійні 16 px, штрих 1.5, `currentColor`; набір `icons` (Home, Template, Runs, Users, Progress, Command, Search, ClipboardCheck, Gauge, FileSign, Key, ArrowRight, Rotate, Play, Pause, Sparkle, Shield, User). Лише декор, підпис завжди поруч.
- **Hero входу:** чипи Templates / Owners / Progress / Search — статичний декор (не кнопки, без стану); чекліст у картці виконується сам, є «Pause animation»; підсвітка картки йде за курсором. Reduced motion — статичний кадр «3 of 4 done».
- **Рух:** перехід між сторінками (підйом 6 px, 240 мс), лічильники на головній «набираються» від нуля (CSS `@property`), кільце й смужка прогресу домальовуються при завантаженні, каскад рядків списку (перші 8, по 24 мс). За `prefers-reduced-motion` усе вимикається.
