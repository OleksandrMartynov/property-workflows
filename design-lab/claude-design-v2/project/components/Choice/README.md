# Choice

Контролі вибору: Checkbox і CheckboxGroup, RadioGroup, Switch, Segmented, Slider. Чекбокс, радіо й перемикач — справжні `<input>` (форми й server actions працюють), Segmented і Slider — ARIA radiogroup та slider. Джерело — `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `segmented.tsx`, `slider.tsx`, `controls.css`.

## Checkbox і CheckboxGroup

- Коробка `size-check` (1rem), `radius-xs`, межа `border-strong` (≥ 3:1), заливка `field`. Вибраний — заливка `primary` і галочка, що домальовується (`stroke-dashoffset`, `duration-base`); змішаний — риска; `tone="done"` — зелений (`status-done-mark`) для виконаної задачі.
- invalid — межа `destructive` і заливка `destructive-tint`; disabled — заливка `muted`, увімкнений disabled — `control-disabled-fill`. hover — межа `foreground`; focus-visible — outline `ring`; натискання — `scale-press`.
- Без підпису потрібен `aria-label`; `indeterminate` виставляє браузер (`aria-checked="mixed"`).
- CheckboxGroup — `<fieldset>` із `<legend>`, окремий `name` для кожного значення, батьківський пункт у змішаному стані, відступ дітей 1.5rem, підсумок «2 of 3 done» (`aria-live`, `tabular`).

## RadioGroup

`<fieldset role="radiogroup">` із `<legend>` і справжніми `<input type="radio">` під одним `name`: Tab заходить на вибраний пункт, стрілки переміщують і вибирають по колу, Пропуск вибирає. Кругла коробка `size-check`, вибраний — заливка `primary` і точка 6px, що росте на `spring-bouncy`. Напрямок `column` або `row`; вимкнений пункт приглушений; помилка групи — під нею, пункти з рамкою `destructive`. Пояснення під кожним пунктом не пишемо.

## Switch

`role="switch"` на справжньому `<input type="checkbox">`: Пропуск і Enter. Трек `size-switch-w` × `size-switch-h` (2rem × 1.25rem), кулька на 6px менша за трек, при натисканні розтягується (×1.18) і їде на `spring-bouncy` (перельот ~4.5%, лише для кульки). Вимкнений — `muted`; зайнятий (`aria-busy`) — на кульці крутиться дуга, доки зміну зберігають, при відмові значення повертається. `labelPosition="left"` притискає перемикач до правого краю.

## Segmented

`role="radiogroup"` із кнопками `role="radio"` (roving tabindex): стрілки переміщують і вибирають, Home / End. Бігунок — один елемент (`background` з hairline і `elevation-1`), що ковзає між пунктами на `spring-snappy`; до першого виміру вибраний пункт має власний фон. Розміри `sm` / `md` / `lg` (22 / 26 / 30px висота пункту), `block` — на всю ширину. Приклад — «List · Schema · Canvas». Іконка перед підписом (14px) — лише декор.

## Slider

`role="slider"` на кожному бігунку (APG): ←/→ ↑/↓ ±step, PgUp / PgDn ±10 кроків, Home / End; перетягування з захопленням вказівника. Рейка `size-track` (0.25rem), заповнення `primary` (`ai-mark` для `tone="ai"`), бігунок `size-thumb` (1rem) із ободом 2px і `scale-thumb` (1.12) під час перетягування; діапазон — два бігунки (назви «Minimum» / «Maximum»). Бульбашка зі значенням (`foreground` на `background`) з'являється при hover, focus і перетягуванні, а з `bubble` — постійно. Підпис і значення — над рейкою, мін / макс — під нею (`showScale`). `aria-valuetext` озвучує відформатоване значення («€1200»). У форму йдуть приховані поля (`<name>_min`, `<name>_max` для діапазону).

## Reduced motion

Пружини стають `ease-standard` за `duration-fast`, бульбашка й кулька не перелітають, `scale-thumb` = 1.

## Do / Don't

- Do: підпис завжди видно; незворотний або великий вибір — RadioGroup, не Switch; Switch — для миттєвого ввімкнення налаштування.
- Don't: власний `<input type="checkbox">` без нашої коробки; `<input type="range">`; пояснення під пунктами; колір як єдина відмінність стану.
