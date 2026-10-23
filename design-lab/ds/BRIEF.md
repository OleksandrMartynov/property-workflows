# Property Workflows — бриф для дизайнерів компонентів і екранів · v0.1

Це правила, за якими ви будуєте компоненти (раунд 2) і екрани (раунд 3) поверх фундаменту. Фундамент — три файли
в цій теці; живий довідник — `index.html` (http://127.0.0.1:4173/index.html). Якщо правило тут і поведінка
`index.html` розходяться — правильний `tokens.css`, а розбіжність — баг, про який треба сказати.

| Файл | Що в ньому |
|---|---|
| `tokens.css` | Усі токени: колір (OKLCH, light/dark, P3), тип, простір, радіуси, шари, тіні, glass, рух, налаштування користувача |
| `base.css` | Reset, базові елементи, типографічні класи, focus ring, selection, scrollbars, autofill, layout-утиліти, примітиви руху |
| `index.html` | Foundations: таблиці токенів, виміряний контраст, статуси, поверхні, тип, простір, Motion-демо, focus |

Мова UI — **англійська** (як у продукті за рішенням PM). Мова цього брифу — українська; код, токени, класи й копірайт
інтерфейсу — англійською.

---

## 1. Скелет сторінки (обов'язковий для кожної сторінки компонента чи екрана)

Кладіть сторінки поруч із `tokens.css` (наприклад, `ds/components-inputs.html`, `ds/screen-login.html`). Якщо сторінка
в підтеці — змініть шляхи на `../tokens.css`, `../base.css`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inputs · Property Workflows</title>
<script>
  /* тема й режим руху до першого кадру — без спалаху */
  try {
    var t = localStorage.getItem("pw-theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    var m = localStorage.getItem("pw-motion"); if (m === "full" || m === "reduce") document.documentElement.dataset.motion = m;
  } catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="base.css">
<style>
  /* стилі компонентів сторінки — лише на токенах */
  .pw-theme-toggle { display: inline-flex; gap: 2px; padding: 2px; background: var(--muted);
    border: var(--hairline) solid var(--border); border-radius: var(--radius-sm); }
  .pw-theme-toggle button { height: 22px; padding: 0 var(--space-2); border-radius: var(--radius-xs);
    font-size: var(--text-meta); font-weight: var(--weight-medium); color: var(--muted-foreground);
    transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard); }
  .pw-theme-toggle button:hover { color: var(--foreground); }
  .pw-theme-toggle button[aria-checked="true"] { background: var(--background); color: var(--foreground);
    box-shadow: 0 0 0 var(--hairline) var(--border), var(--shadow-highlight); }
</style>
</head>
<body>
  <header style="display:flex;justify-content:space-between;align-items:center;height:var(--size-header);padding:0 var(--space-6);border-bottom:var(--hairline) solid var(--border)">
    <span class="t-label">Inputs</span>
    <div class="pw-theme-toggle" role="radiogroup" aria-label="Theme">
      <button type="button" role="radio" data-value="light">Light</button>
      <button type="button" role="radio" data-value="dark">Dark</button>
      <button type="button" role="radio" data-value="system">System</button>
    </div>
  </header>
  <main><!-- ваш контент --></main>
<script>
  (() => {
    const root = document.documentElement, g = document.querySelector(".pw-theme-toggle");
    const btns = [...g.querySelectorAll('[role="radio"]')];
    const sync = () => { const v = root.dataset.theme || "system";
      btns.forEach(b => { const on = b.dataset.value === v; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; }); };
    const set = (v) => { const apply = () => { v === "system" ? delete root.dataset.theme : (root.dataset.theme = v); sync(); };
      try { v === "system" ? localStorage.removeItem("pw-theme") : localStorage.setItem("pw-theme", v); } catch (e) {}
      document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches ? document.startViewTransition(apply) : apply(); };
    g.addEventListener("click", e => { const b = e.target.closest('[role="radio"]'); if (b) set(b.dataset.value); });
    g.addEventListener("keydown", e => { const i = btns.indexOf(document.activeElement); if (i < 0) return;
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; set(n.dataset.value); n.focus(); });
    sync();
  })();
</script>
</body>
</html>
```

Додатково на кожній сторінці:
- **Обидві теми одночасно.** Сітку станів показуйте двома панелями поруч: `<div data-theme="light">` і
  `<div data-theme="dark">` (токени перевизначаються на будь-якому піддереві). Панель задає
  `background: var(--background); color: var(--foreground); font-weight: var(--weight-body)`.
- Перемикач **Motion: system / full / reduced** (`data-motion` на `<html>`) — на сторінках із рухом обов'язково.
- Жодних зовнішніх скриптів, окрім дозволених CDN із точною версією; іконки — inline SVG (stroke 1.5, 16×16, `currentColor`).

---

## 2. Як споживати токени

1. **Ніколи літеральних кольорів** (`#…`, `rgb()`, `oklch(…)` у компонентах). Лише `var(--token)`. Виняток —
   похідні через `color-mix()` **від токенів**: `color-mix(in oklab, var(--primary), var(--foreground) 10%)`.
   Змішуйте в `oklab`, не в `oklch`: інакше відтінок «їде» (індиго з теплим сірим дає фіолетовий).
   Прозорість — `color-mix(in oklch, var(--x) 24%, transparent)`.
2. **Готові стани є токенами**: `--primary-hover`, `--primary-active`, `--destructive-hover`, `--accent-active`,
   `--border-hover`. Не вигадуйте свої, якщо ці підходять.
3. Розміри, відступи, радіуси, тривалості, криві — лише токени. Відступи кратні 4 (`--space-*`); 2px (`--space-0-5`)
   — лише для оптичних поправок.
4. Імена 1:1 із shadcn/ui, тож перенесення в Tailwind 4 — механічне:
   ```css
   @theme inline {
     --color-background: var(--background); --color-foreground: var(--foreground);
     --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
     --color-status-done: var(--status-done); --color-ai: var(--ai); /* … */
     --radius-md: var(--radius-md); --font-sans: var(--font-sans);
   }
   ```
5. Ролі доменних кольорів (три ролі на кожен):
   - `--status-x` — **мітка**: крапка, іконка, заливка чекбокса, кільце прогресу (≥ 3:1 до полотна);
   - `--status-x-foreground` — **текст** на тінті `-bg` і на полотні (≥ 4.5:1);
   - `--status-x-bg` — **тінт** бейджа чи рядка.
   Те саме для `--ai*`, `--variable*`. `--status-completed*` — аліас `--status-done*` (статус запуску).
   Увага: це **відрізняється** від shadcn-конвенції `primary-foreground` = текст на суцільній заливці. Суцільних
   статусних заливок із текстом не робимо.
6. Кольорові значення (OKLCH) — ключові:

   | Токен | Light | Dark |
   |---|---|---|
   | `--primary` | 0.50 0.13 268 | 0.74 0.12 268 (текст на ньому темний) |
   | `--ai` | 0.55 0.19 325 | 0.74 0.16 325 |
   | `--background` / `--sidebar` | 0.991 0.004 85 / 0.968 0.005 85 | 0.178 0.004 80 / 0.158 0.004 80 |
   | `--foreground` / `--muted-foreground` | 0.21 0.008 80 / 0.505 0.009 80 | 0.945 0.004 80 / 0.705 0.008 80 |
   | статус-мітки | L 0.62 (H 150 / 25 / 75 / 268, todo C 0.01) | L 0.74 |
   | статус-текст | L 0.47 | L 0.82 |
   | `--destructive` | 0.55 0.19 25 (білий текст) | 0.66 0.18 25 (темний текст) |

   У темній темі всі суцільні заливки (primary, destructive, sidebar-primary) світлі з темним текстом — це
   задумано, не «інверсія».

---

## 3. Іменування

- Класи компонентів: `pw-<component>` і `pw-<component>__<part>` (`pw-select`, `pw-select__trigger`,
  `pw-select__option`). Утиліти з `base.css` (`.t-*`, `.stack`, `.cluster`, `.num`, `.sr-only`) не перевизначайте.
- Варіанти й розміри — атрибутами: `data-variant="primary|secondary|ghost|destructive"`, `data-size="sm|md|lg"`.
- Стан — ARIA там, де він семантичний (`aria-expanded`, `aria-checked`, `aria-selected`, `aria-invalid`,
  `aria-disabled`, `aria-busy`, `aria-pressed`, `aria-current`), інакше `data-state="open|closed|loading"`.
  Ніяких `.is-active`, коли є ARIA-атрибут.
- Локальні змінні компонента — з підкресленням: `--_h`, `--_pad`.

---

## 4. Стани, які кожен компонент показує (в обох темах)

| Стан | Як виглядає |
|---|---|
| default | Як у специфікації |
| hover | Тінт (`--accent`, `--primary-hover`, `--border-hover`) або підйом картки на 1px. Ніякого зсуву розмітки |
| focus-visible | 2px `outline` у `--ring`, offset `--ring-offset` (2px); у рядках, клітинках, пунктах меню — `--ring-offset-inset` (−2px). Ніколи не glow, ніколи `outline: none` без заміни |
| active / pressed | `transform: scale(var(--scale-press))` на `--spring-snappy`, `--duration-fast` |
| disabled | `opacity: .5` **не** використовуємо: текст `--muted-foreground`, заливка `--muted`, межа `--border`; `cursor: not-allowed` лише на справжніх `disabled`; `aria-disabled="true"` для елементів, що мають лишатися у фокус-порядку (з поясненням у tooltip) |
| invalid | Межа `--destructive`, focus ring стає `--destructive`, повідомлення під полем — `t-meta`, `--destructive`, зв'язане через `aria-describedby`; іконки помилки — не лише колір |
| loading | Кнопка тримає ширину; спінер 14px перед міткою, мітка — у формі тривалої дії («Signing in…»); `aria-busy="true"`; решта UI не блокується. Списки й таблиці — `.skeleton` |
| selected / checked / open / indeterminate / readonly | Де застосовно |
| empty / error | Для складених компонентів (списки, таблиці, комбобокс без результатів: «No matches») |

Кожна сторінка компонента має **сітку станів** (рядки — стани, колонки — варіанти) у light і dark поруч.

---

## 5. Щільність і геометрія

- Текст: body 14/20, label 13/18 (500), meta 12/16, heading 15/20 (600), title 20/28 (600), display 28/32 (600).
  У темній темі `--weight-body` = 450 — компоненти беруть `font-weight: var(--weight-body)`, не 400.
- Висоти: контроли 32 (`--size-control`), малі 28, великі 36 (лише Auth і порожні стани); рядок списку 32,
  клітинка таблиці 36, top bar 44, сайдбар 240.
- Горизонтальний паддинг контролу 12px (малого — 8); іконка 16 (у малих — 14); проміжок іконка–текст 6.
- Радіуси: 4 — kbd, чекбокс, теги; 6 — контроли; 8 — картки, меню, поповери; 10 — bento, палітра команд; 12 —
  діалоги й sheets; pill — бейджі, чипи, перемикач.
- Числа — `.num` (tabular-nums): прогрес, гроші, дати, лічильники. Гроші: `€1,250.00`.
- Межі всередині сторінки — hairline `--border` (декоративні, не несуть сенсу самі). Межа, що визначає контрол
  (чекбокс, радіо, трек перемикача), — `--border-strong` (≥ 3:1).

---

## 6. Поверхні, тіні, glass

- Усередині сторінки — **жодних тіней**: глибина = hairline + один крок тону (`--sidebar` → `--background` →
  `--surface-1`).
- Тіні — лише для того, що плаває: `--shadow-sm` (перетягування на канвасі, hover картки), `--shadow-md`
  (поповер, меню, тост), `--shadow-lg` (діалог, палітра команд). У dark тіні вже містять верхній highlight.
- **Glass** — лише поповер, меню, combobox-список, палітра команд, тости:
  ```css
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: var(--hairline) solid var(--glass-border);
  box-shadow: var(--shadow-md);
  ```
  `prefers-reduced-transparency` і `forced-colors` уже роблять його непрозорим через токени — не обходьте.
  Не кладіть glass на glass; не робіть glass для діалогів (діалог — `--surface-3`, непрозорий, над `--overlay` із
  `--overlay-blur`).

---

## 7. Клавіатура й ARIA (WAI-ARIA APG)

Загальне: усе доступне з клавіатури; порядок фокуса = візуальний; `Esc` закриває найвищий шар і повертає фокус на
тригер; жодних пасток фокуса, крім модальних діалогів; цілі ≥ 24×24 (WCAG 2.5.8).

| Компонент | Патерн APG | Ключове |
|---|---|---|
| Button, icon button | button | `Enter`/`Space`; icon-only — `aria-label`; toggle — `aria-pressed` |
| Checkbox (задача) | checkbox (tri-state для секцій) | `Space`; `aria-checked="mixed"` для секції з частково виконаними |
| Radio group, segmented control | radio group | Стрілки рухають і вибирають, roving `tabindex` |
| Switch | switch | `role="switch"`, `aria-checked`, `Space`/`Enter` |
| Slider (впевненість AI, діапазони) | slider | Стрілки ±1 крок, `PageUp/Down` ±10, `Home/End`; `aria-valuetext` («92% confidence») |
| Select (одиночний) | combobox select-only + listbox | `Enter`/`Space`/`↓` відкривають, type-ahead, `Home/End`, `Esc` |
| Assignee picker, пошук | combobox з автодоповненням + listbox | `aria-activedescendant`, фокус лишається в полі; «No matches» |
| Меню дій рядка (⋯) | menu button + menu | `↓`/`Enter` відкривають на першому пункті, стрілки, `Home/End`, type-ahead, `Esc` |
| Date picker | dialog + grid | Стрілки по днях, `PageUp/Down` місяць, `Shift+PageUp/Down` рік, `Home/End` тиждень; поле приймає текст |
| Time, number | spinbutton | Стрілки ±1, `PageUp/Down` ±10; без нативних спінерів |
| File upload | button + drop zone | Кнопка «Choose file» завжди є; drop — додатково; прогрес — `role="progressbar"` |
| Dialog | dialog (modal) | `<dialog>`+`showModal()`, фокус на першій дії; деструктивне підтвердження — `alertdialog`, фокус на «Cancel» |
| Tooltip | tooltip | На hover і focus, затримка 500ms, `Esc` ховає; лише допоміжний текст |
| Tabs (List · Schema · Canvas) | tabs | Стрілки, автоматична активація; `aria-controls` |
| Toast | status / alert live region | `role="status"` (`aria-live="polite"`); помилки — `role="alert"`; не забирає фокус; пауза таймера на hover/focus |
| Command palette (⌘K) | dialog + combobox + listbox | `⌘K`/`Ctrl K`, групи — `role="group"` з підписом |
| Дерево секцій шаблону | tree / treegrid | Стрілки, `→`/`←` розгортання; перетягування має клавіатурну альтернативу (`Alt+↑/↓`) |
| Прогрес запуску | progressbar або текст | «2 of 5 done» у тексті; кільце — `aria-hidden` + текст поруч |

---

## 8. Рух: живий, вивірений, ніколи не «дерев'яний»

Мета — щоб нічого не відчувалося різким: без лінійних стрибків, без миттєвих появ, без роботизованих прямих переходів.
Але й без видовищності: **полірування й плавність важливіші за ефекти.**

### Токени

| Група | Токени |
|---|---|
| Тривалості | `--duration-instant` 90 · `--duration-fast` 140 · `--duration-base` 200 · `--duration-moderate` 240 · `--duration-slow` 320 · `--duration-celebrate` 400 (максимум) |
| Криві | `--ease-standard` (ease-out за замовчуванням) · `--ease-emphasized` (великі поверхні) · `--ease-exit` (вихід, прискорення) · `--ease-in-out` (морфи, заливки, cross-fade) |
| Пружини (`linear()`) | `--spring-snappy` (ζ 0.82, ~1%) · `--spring-smooth` (ζ 1.0, без перельоту) · `--spring-bouncy` (ζ 0.70, ~4.5%, **лише малі перемикачі й чекбокс**). Тривалість пружини — час заспокоєння: `--spring-*-duration` 280/360/360; відчутна тривалість ≈ 55%. Fallback на `cubic-bezier` — у `tokens.css` |
| Відстань | `--distance-1` 2px · `--distance-2` 4px · `--distance-3` 6px |
| Масштаб | `--scale-enter` 0.98 · `--scale-press` 0.98 · `--scale-rest` 1 |
| Хореографія | `--stagger` 24ms (перші 8 елементів) · `--exit-factor` 0.7 |
| Петлі | `--shimmer-duration` 1600ms · `--ambient-duration` 48s · `--ambient-parallax` 6px |

### Хореографія

- **Поява**: fade + підйом 4–6px + `0.98 → 1` на `--spring-smooth` (`@keyframes pw-enter`, клас `.enter`).
- **Зникнення**: швидше (× `--exit-factor`), `--ease-exit`, лише 2px і fade (`.exit`).
- **Списки**: `.enter-stagger` + `style="--i: n"`; затримка 24ms на перші 8, решта приходить разом із 8-м. Великі
  списки (> 30) — без stagger, лише fade контейнера.
- **Hover**: тінт за `--duration-instant` або підйом картки на 1px. **Ніколи** зміна розміру, паддингу чи жирності.
- **Press**: `scale(var(--scale-press))` на `--spring-snappy` — кнопки, рядки, чипи, картки.
- **Поповер / меню / combobox / палітра**: ростуть **від тригера** — `transform-origin` з боку тригера
  (`--origin: top left` для меню під лівим краєм, `bottom right` для меню над правим тощо), зсув 4px у бік від
  тригера, glass fade, `--spring-snappy` (`.pop-in`). Закриття — `.exit`.
- **Діалог**: `--overlay` з `--overlay-blur` (4px) проявляється за `--duration-moderate`; панель — `pw-enter` на
  `--spring-smooth`; закриття × 0.7.
- **Тости**: новий підіймається на 6px; стек перебудовується FLIP-ом на `--spring-smooth`; максимум три.
- **Чекбокс задачі**: заливка `--status-done` за `--duration-fast`, галочка «малюється» `stroke-dashoffset`
  (`pathLength="1"`) за `--duration-base` із затримкою 30ms, легкий `0.98 → 1` на `--spring-bouncy`.
- **Прогрес**: кільце й смуга заповнюються на `--spring-smooth`; цифри «N of M done» котяться (рулони цифр,
  `tabular-nums`, `--spring-snappy`).
- **Зміна статусу**: кольори перетікають (`--ease-in-out`, `--duration-base`), мітка розмивається (2px blur) і
  з'являється, ширина бейджа морфиться FLIP-ом.
- **Запуск завершено**: бейдж перетікає в «Completed», кільце стає зеленим, **одне** м'яке світіння
  `--glow-done` ≤ 400ms. Без конфеті, частинок, «вибухів».
- **Skeleton**: `.skeleton` — повільний відблиск, потім контент проявляється з легким stagger.
- **Переходи між видами**: `document.startViewTransition` зі спільним елементом (назва запуску в рядку → заголовок
  сторінки запуску, `view-transition-name: run-title`, ставиться лише на час переходу). Без підтримки — `.enter`.
- **Перебудова розмітки** (сортування, видалення рядка, розгортання секції): FLIP, не анімація `height`/`top`.
- Анімуйте лише `transform`, `opacity`, `filter`, кольори. Ніколи `width/height/top/left` у циклах.
- **Ніколи не блокуйте ввід**: анімації переривні, кнопки не `disabled` на час анімації, `pointer-events` не
  вимикаємо, фокус переходить одразу.
- UI ≤ 240ms відчутно; святковий момент ≤ 400ms; нічого лінійного, крім безперервних петель (shimmer, ambient).

### Reduced motion

- Під `prefers-reduced-motion: reduce` (або `html[data-motion="reduce"]`) токени вже обнуляють відстані, масштаб і
  stagger, а пружини стають `--ease-standard` за `--duration-fast`: **ті самі моменти стають короткими fade**.
  Тому компоненти беруть відстань і масштаб **лише з токенів**.
- Декоративне, що має зникнути повністю (ambient, петлі, rolling digits) — клас `.motion-safe` або перевірка в JS:
  ```js
  const motionOK = () => document.documentElement.dataset.motion === "full" ||
    (document.documentElement.dataset.motion !== "reduce" && !matchMedia("(prefers-reduced-motion: reduce)").matches);
  ```
- `html[data-motion="full"]` — свідомий вибір користувача повного руху, перекриває системне налаштування.

### Ambient hero (лише сторінка входу)

Спокійний, не кінематографічний: повільний дрейф mesh-градієнта з `--hero-1/2/3` за `--ambient-duration` (48s,
`--ease-in-out`, alternate), паралакс за вказівником ≤ `--ambient-parallax` (6px), **без 3D-нахилу**. Поверх —
glass-картка з чеклістом «Tenant move-in», який тихо збирається: рядки з'являються зі stagger, галочки малюються по
одній раз на ~1.1s, лічильник «N of 4 done», м'яке згасання й повтор. Можна WebGL/canvas-шейдер, якщо: DPR ≤ 1.5,
≤ 2ms на кадр, пауза поза екраном (`IntersectionObserver`) і на `visibilitychange`, fallback — CSS-градієнти.
Reduced motion — статичний кадр (3 з 4 виконано), reduced transparency — непрозора картка. Кнопка Pause
(WCAG 2.2.2) — якщо анімація довша за 5s.

---

## 9. Копірайт (англійською, як у продукті)

- Sentence case скрізь: «Mark as done», «Launch run», «Add task». Без крапки в кнопках і заголовках; крапка в
  повних реченнях-підказках і помилках.
- Дієслово + об'єкт у кнопках: «Mark as done», «Launch run», «Accept draft», «Reject», «Generate invoice».
- Прогрес: «2 of 5 done». Статуси задачі: «To do», «Done»; запуску: «In progress», «Completed»; терміни:
  «Overdue», «Due soon», «Due 24 Oct».
- Помилки — що сталося й що робити, без вибачень і без «Oops»: «Run not found», «Invalid email or password.»,
  «Enter your email and password.», «Enter a valid email.»; деструктивне — «This cannot be undone.»
- Порожні стани: що тут буде + одна дія. «No runs yet» / «Launch a run from a template to see it here.» /
  кнопка «Browse templates».
- AI: завжди позначено як чернетку з джерелом і впевненістю: «AI draft · 92%», «From lease.pdf, p. 3»,
  дії «Accept» / «Reject» / «Edit».
- Ніяких емодзі як маркерів; іконки — лише SVG.

## 10. Дані — лише синтетичні

- Email: `alex@example.test`, `sam@example.test`, `manager@example.test`, `admin@example.test`, `tenant@example.test`,
  `vendor@example.test`. Аватари — ініціали з email («A», «S»), не фото й не справжні імена.
- Запуски: «Apartment 12, move-in», «Apartment 7, move-out», «House 3, inspection».
- Шаблони: «Tenant move-in», «Tenant move-out», «Inspection».
- Задачі: «Inspect the apartment», «Read the meters», «Photograph the rooms», «Sign the handover form»,
  «Hand over the keys», «Send the welcome email».
- Змінні: `{{tenant_name}}`, `{{tenant_email}}`, `{{unit}}`, `{{move_in_date}}`, `{{deposit}}`.
- Гроші в євро: «€1,250.00», «€180.00»; рахунок «INV-2026-0142». Дати: «24 Oct», «24 Oct 2026».
- Жодних справжніх назв компаній, адрес, людей.

---

## 11. Рекомендований розподіл компонентів між трьома дизайнерами

1. **Inputs & forms**: button (усі варіанти, icon button, button group), text field, textarea, password field (reveal,
   caps-lock hint), select, combobox / assignee picker, date picker, time, number, checkbox (задача, tri-state),
   radio group, switch, slider, file upload, field label / hint / error, form layout.
2. **Navigation & overlays**: AppShell (sidebar, top bar, breadcrumbs), tabs, segmented control, menu, popover,
   tooltip, dialog / alertdialog, sheet, command palette (⌘K), toast, kbd.
3. **Data & domain**: list row, table (36px cells, sort, selection), status badge, progress ring + bar + ticker,
   avatar / assignee stack, run card, task row, section header (required/optional), variable chip, AI draft card
   (provenance + confidence + accept/reject), invoice lines, empty states, skeletons, bento tile.

Кожен дизайнер: одна сторінка на групу, скелет із розділу 1, сітка станів у двох темах, примітки ARIA/клавіатури,
перелік токенів, які компонент використовує, і live-демо руху.

---

## 12. Screens (раунд після компонентів)

### AppShell (усі сторінки після входу)

- **Sidebar** 240px, `--sidebar` (на крок темніший за полотно), правий hairline `--sidebar-border`. Зверху —
  workspace + кнопка пошуку «Search… ⌘K». Навігація (32px рядки, `--sidebar-accent` для hover/current,
  `aria-current="page"`): **Home**, **Runs**, **Templates**; нижче для admin — **Users**; знизу — користувач
  (ініціал + email) з меню «Sign out». Згортання до 56px (іконки + tooltip), `[`.
- **Top bar** 44px: breadcrumbs («Runs › Apartment 12, move-in»), праворуч — дії сторінки (одна primary максимум).
  Hairline знизу з'являється лише при прокрутці.
- **⌘K** — палітра команд (glass, `--radius-lg`): переходи, «Launch run…», пошук запусків і шаблонів.
- Контент: макс. ширина 1120 для списків/форм; сторінка запуску — на всю ширину (3 зони).

### Маршрути й стани

| Маршрут | Вміст | Обов'язкові стани |
|---|---|---|
| `/login` | Див. нижче | default, inline validation, error «missing» і «invalid», loading на submit, reduced motion, light/dark |
| `/` (Home) | Привітання, «My tasks today», активні запуски (кільце + «N of M done»), «Overdue», швидка дія «Launch run» | empty (новий користувач), loading (skeleton), error (retry) |
| `/templates` | Список шаблонів: назва, к-сть секцій і задач, оновлено, дія «Launch» | empty («No templates yet»), loading, error, permission (manager бачить без редагування) |
| `/templates/[id]/launch` | Форма: «Case name» (напр. «Apartment 12, move-in»), список задач по секціях із піккером виконавця на кожну задачу (combobox, «Unassigned»), «Launch run» | validation (порожня назва), loading на submit, error, шаблон не знайдено, permission denied |
| `/runs` | Таблиця/список: назва, шаблон, прогрес (кільце + «2 of 5 done»), статус («In progress» / «Completed»), найближчий термін (Due soon / Overdue), виконавці | empty («No runs yet» + «Browse templates»), loading, error, фільтри без результатів |
| `/runs/[id]` | **3 зони**: ліворуч чекліст (секції → задачі, required/optional, статуси, терміни), центр — деталі задачі (опис, виконавець, термін, «Mark as done»), праворуч — змінні запуску й документи (AI-розбір із провенансом і впевненістю). Підтвердження перед останньою обов'язковою задачею — `alertdialog` «Complete this run?», після — completed-момент | loading, completed (read-only відчуття), error, задача без деталей |
| «Run not found» (404 для чужих запусків) | Спокійна сторінка в AppShell: «Run not found», «It may have been deleted, or you don't have access.», кнопка «Back to runs» | — (не розкриває, чи запуск існує) |

Майбутні (лише дизайн): **Template builder** з трьома видами — List · Schema (гібрид) · Canvas (як n8n: вузли-секції,
з'єднання, мінікарта, зум); **Conditional logic** («Show this task if {{unit_type}} is Apartment») у контексті задачі;
**Invoice draft** (рядки, суми tabular, «Generate invoice», AI-підказки з провенансом); **Dashboard** bento: «My tasks
today», «Overdue», «Active runs», «Invoices to issue».

### Auth (`/login`) — пріоритет

Має бути кращою за сторінки входу Process Street, Linear, Vercel, Attio, Notion, Raycast.

- **Split layout**: ліворуч (≈ 44%, мін. 400px) форма на `--background`; праворуч — ambient hero (розділ 8), що
  натякає на продукт: чекліст «Tenant move-in», який тихо збирається, або граф секцій, що з'єднується. На вузьких
  екранах hero ховається (або стає смугою 160px згори).
- **Форма**: лише email + пароль. Без реєстрації, без OAuth, без «Forgot password», якщо цього немає в продукті.
  Заголовок «Sign in», підзаголовок одним рядком, поля 36px (`--size-control-lg`), мітки «Email», «Password»,
  кнопка «Sign in» на всю ширину.
- Пароль: кнопка «Show / Hide» (icon button з `aria-label`, `aria-pressed`), підказка **Caps Lock is on**
  (`getModifierState("CapsLock")`, `aria-live="polite"`).
- **Inline validation**: на blur і на submit, не на кожен символ. Помилка «missing» — «Enter your email and
  password.»; «invalid» — «Invalid email or password.» (без підказки, яке поле хибне). Помилка над кнопкою,
  `role="alert"`, фокус — на перше невалідне поле.
- **Loading**: кнопка тримає ширину, спінер, «Signing in…», поля `readonly`, не `disabled`.
- `autocomplete="email"` / `"current-password"`, `inputmode="email"`, autofill виглядає нативно-нашим (base.css).
- Light і dark спроєктовані окремо; reduced motion — статичний hero.

---

## 13. Quality bar «leading 2026» (чекліст критика)

**Система**
- [ ] Жодного літерального кольору, розміру чи тривалості поза токенами; похідні — `color-mix` в `oklab` від токенів.
- [ ] Імена й варіанти узгоджені з розділом 3; стани через ARIA.
- [ ] Обидві теми показано поруч; dark — спроєктований (світлі заливки з темним текстом, вищий шар світліший), не інверсія.

**Точність**
- [ ] Усе на сітці 4px; висоти 28/32/36; базові лінії вирівняні; іконки 16/14 оптично відцентровані.
- [ ] Числа tabular; гроші й лічильники не «стрибають».
- [ ] Радіуси за ролями; жодного «rounded-lg everywhere».
- [ ] Тіні лише на плаваючих шарах; glass лише на поповерах, меню, палітрі, тостах.

**Доступність**
- [ ] Текст ≥ 4.5:1, ring і межі контролів ≥ 3:1 в обох темах (перевірка — як у `index.html`).
- [ ] Видимий 2px focus ring на кожному інтерактивному елементі; рядки — inset.
- [ ] Повна клавіатурна модель за APG; `Esc` і повернення фокуса; цілі ≥ 24px.
- [ ] Сенс не передається лише кольором (текст статусу, іконка помилки).
- [ ] `forced-colors` не ламає компонент.

**Жодного браузерного вигляду**
- [ ] Свої select, combobox, date, time, number, checkbox, radio, switch, slider, file, scrollbar, selection, caret,
  autofill, focus ring.

**Рух**
- [ ] Нічого не з'являється миттєво й не зникає стрибком; немає лінійних переходів поза петлями.
- [ ] Поява = fade + 4–6px + 0.98 на пружині; вихід швидший (× 0.7).
- [ ] Поповери й меню ростуть від тригера (правильний `transform-origin`).
- [ ] Hover без зсуву розмітки; press = 0.98.
- [ ] Прогрес заповнюється плавно, цифри котяться; статус перетікає, а не перемикається.
- [ ] Completed-момент ≤ 400ms, м'який, без конфеті.
- [ ] Анімуються лише transform / opacity / filter / колір; FLIP для перебудов; ввід ніколи не блокується.
- [ ] Reduced motion: ті самі моменти — короткі fade; ambient статичний; є перемикач на сторінці.
- [ ] 60fps на середньому ноутбуці; немає layout thrash.

**Смак**
- [ ] Стриманість рівня Linear / Raycast / Vercel / Attio / Stripe: спокійно, точно, з легкою глибиною.
- [ ] Жодних AI-кліше: фіолетово-синіх градієнтних героїв, кремового з засічками й теракотою, неону на чорному,
  емодзі-маркерів.
- [ ] AI-колір (magenta) лише для AI; primary (indigo) — для дій і фокусу; статуси — лише для статусів.
- [ ] Копірайт англійською за розділом 9; дані — лише синтетичні за розділом 10.

## 14. Правило тексту (вимога власника, 23.10.2026)

Лише потрібний текст: заголовок, підписи полів, значення, помилки й тексти з AC. **Жодних** пояснювальних підзаголовків під заголовками («Use your work email to open your workspace»), підказок-«води», рядків «No account yet? …», копірайтів, описів «що тут можна зробити». Інтерфейс говорить формою й дією, а не абзацами. Порожній стан — одне речення з AC + одна дія. Це правило діє для всіх екранів і дизайн-системи (також у Claude Design і `DESIGN.md`).
