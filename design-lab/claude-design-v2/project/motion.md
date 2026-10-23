# Рух

Мета — щоб нічого не відчувалося різким: без лінійних стрибків, без миттєвих появ, без «дерев'яних» прямих переходів. І без видовищності: полірування й плавність важливіші за ефекти. Рух живе в токенах `duration-*`, `ease-*`, `spring-*`, `distance-*`, `scale-*` (родини Duration, Easing, Effects у `tokens.json`); у компонентах — лише вони, жодних голих `200ms`.

## Токени

- Тривалості: `duration-instant` 90 · `duration-fast` 140 · `duration-base` 200 · `duration-moderate` 240 · `duration-slow` 320 · `duration-celebrate` 400 (максимум). Вихід = вхід × `exit-factor` 0.7.
- Криві: `ease-standard` (ease-out за замовчуванням), `ease-emphasized` (великі поверхні), `ease-exit` (вихід), `ease-in-out-soft` (смужка прогресу, морфи, cross-fade).
- Пружини `linear()`: `spring-snappy` (~1% перельоту) — press, меню; `spring-smooth` (без перельоту) — поява діалогу. Тривалість пружини — час заспокоєння: `spring-snappy-duration` 280, `spring-smooth-duration` 360; відчутно ≈ 55% від неї. Пружина лише на `transform`: `opacity` і колір ніколи не на пружині з перельотом. Без підтримки `linear()` — fallback на `cubic-bezier` (`@supports not`).
- Відстані `distance-1/2/3` = 2 / 4 / 6px, `distance-slide` = 24px (перегортання місяця); масштаб `scale-enter` = 0.98, `scale-press` = 0.97, `scale-thumb` = 1.12 (бігунок slider); `shimmer-duration` 1600.
- `spring-bouncy` (перельот ~4.5%, `spring-bouncy-duration` 360) — локальний токен `controls.css`, лише для малих перемикачів (кулька Switch, галочка й радіо, значки в полі); колір і прозорість на ній не рухаємо. Не входить у `tokens.json`.

## Що вже є в `globals.css`

| Утиліта | Рух | Де |
| --- | --- | --- |
| `transition-ui` | колір, межа, тінь, прозорість за `duration-fast` на `ease-standard` | усі інтерактивні елементи |
| `press` | `scale(0.97)` (`scale-press`) на `spring-snappy` при `:active`, темніша заливка | кнопки |
| `[data-clicked]` | пульс-кільце: `box-shadow` від 0 до 7px, прозорість `ring` 60% → 0%, 520ms на `ease-standard`; ставить `InteractionFeedback` на pointerdown і знімає через 560ms | кнопки, посилання, пункти списку, вкладки |
| `route-progress` | смуга зверху, 2px, `primary` → `ai-mark`: `running` — `scaleX` до 0.88 за 9s по кривій, що гальмує; `done` — до 1 і fade за 420ms | перехід за внутрішнім посиланням |
| `animate-ui-spin` | спінер 700ms лінійно (1600ms при reduced motion) | `Button loading` |
| `animate-ui-rise` · `animate-ui-fade` | поява: підйом 6px + 0.98 → 1 на `spring-smooth`; чистий fade за `duration-base`. Для списків індекс `--i` дає stagger 24ms на перші 8 рядків | рядки таблиці запусків, вміст, що з'являється |
| `animate-ui-draw` | галочка малюється (`stroke-dashoffset`) за `duration-base` із затримкою 60ms | чекбокс задачі |
| `animate-ui-glow` | одне м'яке світіння `status-done-mark` за `duration-celebrate` | завершення запуску |
| `skeleton` | відблиск `shimmer-duration` на `muted` | заглушки завантаження |
| `.ui-dialog` | вхід: `opacity` за `duration-moderate` + підйом на `spring-smooth`; вихід ×0.7 на `ease-exit`; підкладка `overlay` з blur 4px | Dialog, палітра ⌘K |
| `animate-ui-reveal` · `animate-ui-pop` · `animate-ui-echo` | поява з blur, «поп» галочки, повільне «ехо» даху | лише hero входу |
| `surface-float` | вхід (`data-state="open"`): прозорість і зсув 4px від якоря з масштабом 0.98 на `spring-snappy` (`spring-snappy-duration`); вихід (`closing`): швидше, `duration-instant`, `ease-exit`, зсув 2px; `transform-origin` біля якоря, при flip угору зсув дзеркальний | Select, Combobox, MultiSelect, календар, поповер часу |
| `sf-hl` | ковзна підсвітка активного рядка списку: один елемент їде між рядками (`transform` + `height`) на `spring-snappy`; перший показ — без руху | списки Select-родини |
| `shell-rail` | ширина сайдбару 240px ↔ `size-sidebar-rail` (56px) переходить за `spring-smooth-duration` на `spring-smooth`; за reduced motion — `duration-fast` на `ease-standard` | AppShell, кнопка / клавіша `[` / команда ⌘K |
| `ui-tip-in` (`.rail-tip::after`) | підказка згорнутого сайдбару: прозорість 0 → 1 і зсув на 4px зліва за `duration-fast` на `ease-standard`; за reduced motion — без анімації | наведення й фокус на іконках у рейці |
| `dt-cal__pane` | перегортання місяця: стара панель виходить на `distance-slide` за `duration-base`, нова входить із протилежного боку на `spring-smooth`; напрямок задає `--dir` | календар |

## Хореографія

- **Поява**: fade + підйом 4–6px + 0.98 → 1 на `spring-smooth`. **Списки**: stagger 24ms на перші 8 рядків, решта приходить разом із 8-м. **Зникнення**: швидше, `ease-exit`, лише 2px і fade.
- **Hover**: тінт за `duration-instant` або підйом картки (межа `border-strong`, `elevation-2`) — ніколи зміна розміру, паддингу чи жирності.
- **Press**: `scale(0.97)` на `spring-snappy` — кнопки, рядки, чипи, картки; одразу після кліку — пульс-кільце токеном `ring` (520ms, розширюється до 7px і гасне).
- **Навігація**: клік по внутрішньому посиланню запускає смугу зверху (2px, `primary` → `ai-mark`, до ~88%); коли адреса змінилась, смуга добігає до 100% і гасне за 420ms; якщо перехід не стався — зникає за 12 с. Смуга `aria-hidden`, не блокує ввід.
- **Сайдбар**: згортання й розгортання — зміна ширини на `spring-smooth` без перельоту; підписи в рейці одразу стають `sr-only` (не стрибають), контент поруч розтягується разом із шириною. Підказки рейки з'являються з прозорістю й зсувом 4px за `duration-fast`; стан зберігається в `localStorage` і при першому показі застосовується без руху.
- **Діалог**: підкладка з розмиттям 4px за `duration-moderate`; панель — поява на `spring-smooth`; закриття × 0.7.
- **Чекбокс задачі**: заливка `status-done` за `duration-fast`, галочка малюється за `duration-base`.
- **Чекбокс, радіо, Switch**: коробка натискається до `scale-press`; галочка домальовується (`stroke-dashoffset`, `duration-base`); точка радіо й кулька Switch їдуть на `spring-bouncy`; на натиснутому Switch кулька розтягується ×1.18; у стані busy на кульці крутиться дуга 800ms.
- **Segmented**: бігунок — один елемент, що ковзає між пунктами (`transform` + `width`) на `spring-snappy`; перша розкладка без руху.
- **Slider**: заповнення й бігунок рухаються на `spring-snappy`, під час перетягування без переходу (слідують за вказівником); бігунок росте до `scale-thumb`, бульбашка з'являється за `duration-fast` (прозорість) і `spring-snappy` (підйом).
- **Stepper (NumberField)**: утримання «−» чи «+» — перший крок одразу, пауза 420ms, далі інтервал 150ms → 56ms (×0.95 на крок), множник ×2 / ×5 / ×10 після 1 / 2 / 3.2 с; значок кнопки стискається до 0.82, бульбашка множника з'являється як бульбашка slider.
- **Поле**: значки (помилка, «очистити», Caps Lock) з'являються з підскоком (`ctl-pop`, `spring-bouncy`); шеврон Select розвертається на `spring-snappy`; фішки MultiSelect входять із масштабу 0.8 на `spring-smooth`, зникають ×0.7, решта переїжджає (FLIP).
- **Повідомлення поля**: помилка й підказка ділять одну клітинку — cross-fade `duration-base` із зсувом 4px; поле без підказки розкриває рядок помилки (`grid-template-rows`) на `spring-smooth`.
- **FileDrop**: при перетягуванні межа «марширує» (1200ms, лінійно — безперервна петля), іконка підстрибує на 4px; рядок файлу входить підйомом 6px на `spring-smooth`, виходить ×0.7; прогрес розкривається під рядком і росте через `scaleX`.
- **Прогрес**: смужка заповнюється за `duration-slow` на `ease-in-out-soft`; число поруч — `tabular-nums`.
- **Запуск завершено**: бейдж стає «Completed», смужка зеленіє, одне світіння ≤ 400ms. Без конфеті.
- Анімуйте лише `transform`, `opacity`, `filter`, кольори. Ввід ніколи не блокується.

Заплановано, токенів і утиліт ще немає: тости, View Transitions зі спільним елементом, «rolling digits» у лічильнику, FLIP бейджа при зміні статусу.

## Reduced motion і прозорість

`prefers-reduced-motion` обнуляє відстані й масштаб через токени (`distance-1/2/3`, `distance-slide` → 0, `scale-enter`, `scale-press`, `scale-thumb` → 1); пульс-кільце `[data-clicked]` замінюється статичним контуром (`outline: 2px solid ring`, відступ 1px), смуга навігації стає статичною на всю ширину (без `scaleX`-руху), а пружини (зокрема `spring-bouncy`) стають `ease-standard` за `duration-fast`: ті самі моменти стають короткими fade. `duration-slow` стає `duration-fast`, `duration-celebrate` — `duration-base`. Окремо в контролах: `surface-float` грає 1ms (миттєво), панель місяця — fade за `duration-fast` без зсуву, фішки, значки й день у календарі без анімації, «марш» межі FileDrop зупиняється, дуга busy у Switch крутиться повільніше (1600ms), шеврон перемикається за 1ms. Декоративні петлі зупиняються повністю (`animate-ui-echo` лишає статичний слід, `skeleton` — суцільну заливку). `prefers-reduced-transparency` робить glass непрозорим (`glass-alpha` 100%, `glass-blur` 0, підкладка діалогу без розмиття).

## Hero входу (лише сторінка `/login`)

«Сцена» (`stage*`; різна в темах: світла «перламутрова» зі світлими `stage-glow-*` і темним текстом, темна кінематографічна): шейдер-тло зі світінням `stage-glow-1/2/3`, «ехо» даху з лого, заголовок із побуквеним проявом (`animate-ui-reveal`), скляна картка, у якій чекліст «Tenant move-in» сам виконується й завершується («N of 4 done»). Чипи можливостей — статичний декор (не кнопки). Рух лише тут; у застосунку всередині — спокійно. Reduced motion — статичний кадр «3 of 4 done»; кнопка Pause доступна завжди, бо анімація довша за 5 секунд (WCAG 2.2.2).
